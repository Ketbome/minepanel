import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import { ScheduledTask, ScheduleKind } from './entities/scheduled-task.entity';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';

const CHECK_INTERVAL_MS = 30_000;

@Injectable()
export class ScheduledTasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledTasksService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectRepository(ScheduledTask)
    private readonly taskRepo: Repository<ScheduledTask>,
    private readonly serverManagement: ServerManagementService,
    private readonly dockerComposeService: DockerComposeService,
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

  async create(serverId: string, dto: CreateScheduledTaskDto): Promise<ScheduledTask> {
    this.assertCommandPayload(dto.type, dto.command);
    const scheduleKind = dto.scheduleKind ?? 'interval';
    this.assertSchedulePayload(scheduleKind, dto.intervalMinutes, dto.cronExpression);

    const task = this.taskRepo.create({
      serverId,
      name: dto.name,
      type: dto.type,
      command: dto.type === 'command' ? dto.command : null,
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

  async update(serverId: string, taskId: number, dto: UpdateScheduledTaskDto): Promise<ScheduledTask> {
    const task = await this.getOwnedTask(serverId, taskId);
    const nextType = dto.type ?? task.type;
    const nextCommand = dto.command ?? task.command ?? undefined;
    this.assertCommandPayload(nextType, nextCommand);

    const nextKind = dto.scheduleKind ?? task.scheduleKind ?? 'interval';
    const nextInterval = dto.intervalMinutes ?? task.intervalMinutes ?? undefined;
    const nextCron = dto.cronExpression ?? task.cronExpression ?? undefined;
    this.assertSchedulePayload(nextKind, nextInterval, nextCron);

    if (dto.name !== undefined) task.name = dto.name;
    if (dto.type !== undefined) task.type = dto.type;
    if (dto.command !== undefined || dto.type !== undefined) {
      task.command = nextType === 'command' ? (nextCommand ?? null) : null;
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
  }

  async runNow(serverId: string, taskId: number): Promise<ScheduledTask> {
    const task = await this.getOwnedTask(serverId, taskId);
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
    try {
      if (task.type === 'restart') {
        const ok = await this.serverManagement.restartServer(task.serverId);
        task.lastResult = ok ? 'Server restarted' : 'Failed to restart server';
      } else {
        task.lastResult = await this.executeCommandTask(task);
      }
    } catch (error) {
      task.lastResult = `Execution failed: ${(error as Error).message}`;
      this.logger.warn(`Scheduled task ${task.id} failed: ${(error as Error).message}`);
    } finally {
      task.lastRunAt = new Date();
      task.nextRunAt = this.computeNextRun(task);
      await this.taskRepo.save(task);
    }
  }

  private async executeCommandTask(task: ScheduledTask): Promise<string> {
    if (!task.command) {
      return 'No command configured';
    }

    const config = await this.dockerComposeService.getServerConfig(task.serverId);
    const rconPort = config?.rconPort;
    if (!rconPort) {
      return 'Command skipped: RCON port not configured for this server';
    }

    const result = await this.serverManagement.executeCommand(task.serverId, task.command, rconPort, config?.rconPassword);
    return result.success ? result.output || 'Command executed' : `Command failed: ${result.output}`;
  }

  private async getOwnedTask(serverId: string, taskId: number): Promise<ScheduledTask> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task || task.serverId !== serverId) {
      throw new NotFoundException(`Scheduled task ${taskId} not found for server ${serverId}`);
    }
    return task;
  }

  private assertCommandPayload(type: string, command: string | undefined): void {
    if (type === 'command' && (!command || !command.trim())) {
      throw new BadRequestException('command is required when type is "command"');
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
