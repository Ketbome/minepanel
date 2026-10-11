import { NotificationsService } from 'src/notifications/notifications.service';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import { ScheduledTask, ScheduleKind } from './entities/scheduled-task.entity';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';

interface TaskRunResult { outcome: 'success' | 'failed' | 'skipped'; text: string }

const CHECK_INTERVAL_MS = 30_000;
const MAX_ANNOUNCEMENTS = 20;
const MAX_ANNOUNCEMENT_LENGTH = 256;
const MAX_COMMAND_LENGTH = 1024;

export const announcementLines = (text: string | null | undefined): string[] =>
  (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

// `tellraw` instead of `say`, so the message is not prefixed with [Server]. The text
// goes through JSON.stringify, so quotes or braces in a message cannot break out of it.
// &-codes become § so admins can colour messages the way they do in plugin configs.
export const announcementCommand = (message: string): string =>
  `tellraw @a ${JSON.stringify({ text: message.replace(/&([0-9a-fk-or])/gi, '§$1') })}`;

@Injectable()
export class ScheduledTasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledTasksService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly failureAlerts = new Map<number, number>();
  // Task ids being executed, so "Run now" and the timer never run the same task at once.
  private readonly inFlight = new Set<number>();

  constructor(
    @InjectRepository(ScheduledTask)
    private readonly taskRepo: Repository<ScheduledTask>,
    private readonly serverManagement: ServerManagementService,
    private readonly dockerComposeService: DockerComposeService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.runDueTasks();
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  listByServer(serverId: string): Promise<ScheduledTask[]> {
    return this.taskRepo.find({ where: { serverId }, order: { createdAt: 'ASC' } });
  }

  async create(serverId: string, dto: CreateScheduledTaskDto, canUseConsole = true): Promise<ScheduledTask> {
    this.assertCanRunCommands(dto.type, canUseConsole);
    this.assertCommandPayload(dto.type, dto.command);
    const scheduleKind = dto.scheduleKind ?? 'interval';
    this.assertSchedulePayload(scheduleKind, dto.intervalMinutes, dto.cronExpression);

    const task = this.taskRepo.create({
      serverId,
      name: dto.name,
      type: dto.type,
      command: dto.type === 'restart' ? null : dto.command,
      scheduleKind,
      intervalMinutes: scheduleKind === 'interval' ? dto.intervalMinutes : null,
      cronExpression: scheduleKind === 'cron' ? dto.cronExpression : null,
      enabled: dto.enabled ?? true,
      lastRunAt: null,
      lastResult: null,
    });
    task.nextRunAt = this.computeNextRun(task);

    return this.taskRepo.save(task);
  }

  async update(serverId: string, taskId: number, dto: UpdateScheduledTaskDto, canUseConsole = true): Promise<ScheduledTask> {
    const task = await this.getOwnedTask(serverId, taskId);
    const nextType = dto.type ?? task.type;
    this.assertCanRunCommands(task.type, canUseConsole);
    this.assertCanRunCommands(nextType, canUseConsole);
    const nextCommand = dto.command ?? task.command ?? undefined;
    this.assertCommandPayload(nextType, nextCommand);

    const nextKind = dto.scheduleKind ?? task.scheduleKind ?? 'interval';
    const nextInterval = dto.intervalMinutes ?? task.intervalMinutes ?? undefined;
    const nextCron = dto.cronExpression ?? task.cronExpression ?? undefined;
    this.assertSchedulePayload(nextKind, nextInterval, nextCron);

    const previousType = task.type;
    if (dto.name !== undefined) task.name = dto.name;
    if (dto.type !== undefined) task.type = dto.type;
    if (dto.command !== undefined || dto.type !== undefined) {
      const command = nextType === 'restart' ? null : (nextCommand ?? null);
      // A new message list starts over from its first message.
      if (command !== task.command || nextType !== previousType) task.announcementIndex = 0;
      task.command = command;
    }

    const scheduleChanged = nextKind !== task.scheduleKind || (nextKind === 'interval' && nextInterval !== task.intervalMinutes) || (nextKind === 'cron' && nextCron !== task.cronExpression);
    if (scheduleChanged) {
      task.scheduleKind = nextKind;
      task.intervalMinutes = nextKind === 'interval' ? (nextInterval ?? null) : null;
      task.cronExpression = nextKind === 'cron' ? (nextCron ?? null) : null;
      task.nextRunAt = this.computeNextRun(task);
    }
    if (dto.enabled !== undefined) {
      if (dto.enabled && !task.enabled) {
        task.nextRunAt = this.computeNextRun(task);
      }
      task.enabled = dto.enabled;
    }

    return this.taskRepo.save(task);
  }

  async remove(serverId: string, taskId: number): Promise<void> {
    const task = await this.getOwnedTask(serverId, taskId);
    await this.taskRepo.remove(task);
    this.failureAlerts.delete(task.id);
  }

  async runNow(serverId: string, taskId: number, canUseConsole = true): Promise<ScheduledTask> {
    const task = await this.getOwnedTask(serverId, taskId);
    this.assertCanRunCommands(task.type, canUseConsole);
    await this.executeTask(task);
    return task;
  }

  private async runDueTasks(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    try {
      const dueTasks = await this.taskRepo.find({
        where: { enabled: true, nextRunAt: LessThanOrEqual(new Date()) },
      });

      for (const task of dueTasks) {
        await this.executeTask(task);
      }
    } catch (error) {
      this.logger.warn(`Failed to run due tasks: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    if (this.inFlight.has(task.id)) {
      return;
    }
    this.inFlight.add(task.id);
    let failed = false;
    const rule = await this.notifications.getAlertRules().catch(() => ({ enabled: false, taskFailureEnabled: false, cooldownMinutes: 60 }));
    const notifyFailure = rule.enabled && rule.taskFailureEnabled;
    try {
      if (task.type === 'restart') {
        const ok = notifyFailure ? await this.serverManagement.restartServer(task.serverId, false) : await this.serverManagement.restartServer(task.serverId);
        task.lastResult = ok ? 'Server restarted' : 'Failed to restart server';
        failed = !ok;
      } else if (task.type === 'announce') {
        const result = await this.executeAnnouncementTask(task);
        task.lastResult = result.text; failed = result.outcome === 'failed';
      } else {
        const result = await this.executeCommandTask(task);
        task.lastResult = result.text; failed = result.outcome === 'failed';
      }
    } catch (error) {
      failed = true;
      task.lastResult = `Execution failed: ${(error as Error).message}`;
      this.logger.warn(`Scheduled task ${task.id} failed: ${(error as Error).message}`);
    } finally {
      task.lastRunAt = new Date();
      task.nextRunAt = this.computeNextRun(task);
      try {
        await this.taskRepo.save(task);
        if (failed && notifyFailure) {
          const now = Date.now();
          const previous = this.failureAlerts.get(task.id);
          if (previous === undefined || now - previous >= rule.cooldownMinutes * 60_000) {
            if (this.failureAlerts.size >= 512) { const oldest = this.failureAlerts.keys().next().value; if (oldest !== undefined) this.failureAlerts.delete(oldest); }
            this.failureAlerts.set(task.id, now);
            await this.notifications.sendOperationalAlert('task', task.serverId, `Task #${task.id} (${task.type}) failed`).catch(() => this.logger.warn('Scheduled task notification failed'));
          }
        }
      } finally { this.inFlight.delete(task.id); }
    }
  }

  private async executeAnnouncementTask(task: ScheduledTask): Promise<TaskRunResult> {
    const messages = announcementLines(task.command);
    if (messages.length === 0) {
      return { outcome: 'skipped', text: 'No messages configured' };
    }
    // Bedrock has no working command path yet; "sent" there would silently skip messages.
    const config = await this.dockerComposeService.getServerConfig(task.serverId);
    if (config?.edition === 'BEDROCK') {
      return { outcome: 'skipped', text: 'Announcement skipped: announcements are only supported on Java servers' };
    }
    const index = (task.announcementIndex ?? 0) % messages.length;
    const result = await this.executeCommandTask(task, announcementCommand(messages[index]));
    // Advance only when the message went out, so a stopped server does not skip one.
    if (result.outcome === 'success') {
      task.announcementIndex = (index + 1) % messages.length;
      return { outcome: 'success', text: `Announced ${index + 1}/${messages.length}: ${messages[index]}` };
    }
    return result;
  }

  private async executeCommandTask(task: ScheduledTask, command = task.command): Promise<TaskRunResult> {
    if (!command) {
      return { outcome: 'skipped', text: 'No command configured' };
    }

    const config = await this.dockerComposeService.getServerConfig(task.serverId);
    if (config?.edition === 'BEDROCK') return { outcome: 'skipped', text: 'Command skipped: commands are only supported on Java servers' };
    const rconPort = config?.rconPort;
    if (!rconPort) {
      return { outcome: 'skipped', text: 'Command skipped: RCON port not configured for this server' };
    }

    const result = await this.serverManagement.executeCommand(task.serverId, command, rconPort, config?.rconPassword);
    return { outcome: result.success ? 'success' : 'failed', text: result.success ? result.output || 'Command executed' : `Command failed: ${result.output}` };
  }

  private async getOwnedTask(serverId: string, taskId: number): Promise<ScheduledTask> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task || task.serverId !== serverId) {
      throw new NotFoundException(`Scheduled task ${taskId} not found for server ${serverId}`);
    }
    return task;
  }

  // A command task is console access on a timer, so it needs the same permission.
  private assertCanRunCommands(type: string, canUseConsole: boolean): void {
    if (type === 'command' && !canUseConsole) {
      throw new ForbiddenException('You do not have permission to use the console');
    }
  }

  private assertCommandPayload(type: string, command: string | undefined): void {
    if (type === 'command' && (!command || !command.trim())) {
      throw new BadRequestException('command is required when type is "command"');
    }
    if (type === 'command' && command.length > MAX_COMMAND_LENGTH) {
      throw new BadRequestException(`command must be at most ${MAX_COMMAND_LENGTH} characters`);
    }
    if (type !== 'announce') return;
    const messages = announcementLines(command);
    if (messages.length === 0) {
      throw new BadRequestException('At least one message is required when type is "announce"');
    }
    if (messages.length > MAX_ANNOUNCEMENTS) {
      throw new BadRequestException(`At most ${MAX_ANNOUNCEMENTS} messages are allowed`);
    }
    if (messages.some((message) => message.length > MAX_ANNOUNCEMENT_LENGTH)) {
      throw new BadRequestException(`Each message must be at most ${MAX_ANNOUNCEMENT_LENGTH} characters`);
    }
  }

  private assertSchedulePayload(kind: ScheduleKind, intervalMinutes: number | undefined, cronExpression: string | undefined): void {
    if (kind === 'interval') {
      if (!intervalMinutes) {
        throw new BadRequestException('intervalMinutes is required when scheduleKind is "interval"');
      }
      return;
    }

    if (!cronExpression || !cronExpression.trim()) {
      throw new BadRequestException('cronExpression is required when scheduleKind is "cron"');
    }
    try {
      CronExpressionParser.parse(cronExpression.trim());
    } catch (error) {
      throw new BadRequestException(`Invalid cron expression: ${(error as Error).message}`);
    }
  }

  private computeNextRun(task: Pick<ScheduledTask, 'scheduleKind' | 'intervalMinutes' | 'cronExpression'>): Date {
    if (task.scheduleKind === 'cron' && task.cronExpression) {
      return CronExpressionParser.parse(task.cronExpression.trim()).next().toDate();
    }
    return new Date(Date.now() + (task.intervalMinutes ?? 60) * 60 * 1000);
  }
}
