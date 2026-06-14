import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { MetricsService } from './metrics.service';

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
  ) {}

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
}
