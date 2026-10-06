import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Query, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { AuditLogService } from 'src/users/services/audit-log.service';
import { TickCommandDto } from 'src/server-management/dto/tick-command.dto';
import { compileTickPattern, isTickPatternSlow } from './tick-stats';
import { MetricsService } from './metrics.service';
import { MonitoringService } from './monitoring.service';

const MIN_HOURS = 1;
const MAX_HOURS = 168;
const DEFAULT_HOURS = 24;

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly monitoring: MonitoringService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get(':id/live')
  async getLive(@Request() req, @Param('id') id: string) {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    this.accessControlService.assertServerAccess(user, id);
    return this.monitoring.getSnapshot(id);
  }

  @Get(':id/history')
  async getHistory(@Request() req, @Param('id') id: string, @Query('hours') hours?: string) {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    this.accessControlService.assertServerAccess(user, id);

    const parsedHours = Number.parseInt(hours ?? '', 10);
    const safeHours = Number.isFinite(parsedHours) ? Math.min(MAX_HOURS, Math.max(MIN_HOURS, parsedHours)) : DEFAULT_HOURS;

    const points = await this.metricsService.getHistory(id, safeHours);
    return { serverId: id, hours: safeHours, points };
  }

  @Get(':id/uptime')
  async getUptime(@Request() req, @Param('id') id: string) {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    this.accessControlService.assertServerAccess(user, id);
    return { serverId: id, ...(await this.metricsService.getUptime(id)) };
  }

  // Admin only: it runs an arbitrary RCON command, exactly what saving that command allows.
  @Post(':id/tick-test')
  async testTickCommand(
    @Request() req,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) body: TickCommandDto,
  ) {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    if (!this.accessControlService.isAdmin(user)) throw new ForbiddenException('Only admin can perform this action');
    if (!body.tickCommand?.trim()) throw new BadRequestException('tickCommand is required');
    for (const pattern of [body.tickTpsPattern, body.tickMsptPattern]) {
      if (pattern && !compileTickPattern(pattern)) throw new BadRequestException('Patterns must be valid regular expressions with a capture group for the number');
      if (pattern && isTickPatternSlow(pattern)) throw new BadRequestException('Pattern is too slow: it backtracks catastrophically on simple input');
    }
    const command = body.tickCommand.trim();
    // Like the console, a test runs an arbitrary RCON command, so it leaves the same trace.
    const audit = (outcome: 'success' | 'error') =>
      this.auditLogService.record({
        actorUserId: user.id,
        actorUsername: user.username,
        category: 'servers',
        action: 'test_tick_command',
        outcome,
        serverId: id,
        summary: `Tested metrics tick command on ${id}: ${command}`,
        metadata: { command },
      });
    try {
      const result = await this.monitoring.testTickCommand(id, command, { tps: body.tickTpsPattern, mspt: body.tickMsptPattern });
      await audit('success');
      return result;
    } catch (error) {
      await audit('error');
      throw error;
    }
  }
}
