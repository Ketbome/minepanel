import { BadRequestException, Controller, ForbiddenException, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PayloadToken } from '../auth/models/token.model';
import { AccessControlService } from '../users/services/access-control.service';
import { UsersService } from '../users/services/users.service';
import { UpdateNotSupportedError, UpdaterService } from './updater.service';
import { VersionService } from './version.service';

@Controller('version')
@UseGuards(JwtAuthGuard)
export class VersionController {
  constructor(
    private readonly versionService: VersionService,
    private readonly updaterService: UpdaterService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  // `refresh=true` is the panel's "check now": it skips the hourly cache, though
  // never more than once a minute.
  @Get()
  async getVersion(@Query('refresh') refresh?: string) {
    const [info, canSelfUpdate, lastUpdate] = await Promise.all([
      this.versionService.getVersionInfo({ refresh: refresh === 'true' }),
      this.updaterService.canSelfUpdate(),
      this.updaterService.getLastResult(),
    ]);

    return { ...info, canSelfUpdate, lastUpdate };
  }

  // Polled while an update is in flight. It answers from the recorded outcome
  // alone, so the panel can be asked every few seconds without spending the
  // hourly GitHub budget that GET /version does.
  @Get('update-status')
  async getUpdateStatus() {
    return {
      current: this.versionService.getCurrentVersion(),
      lastUpdate: await this.updaterService.getLastResult(),
    };
  }

  // Recreating the whole stack is an admin action, and it is irreversible from
  // inside the panel once it starts.
  @Post('update')
  async update(@Request() req) {
    await this.requireAdmin(req);

    try {
      return await this.updaterService.start();
    } catch (error) {
      if (error instanceof UpdateNotSupportedError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async requireAdmin(req): Promise<void> {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    if (!this.accessControlService.isAdmin(user)) {
      throw new ForbiddenException('Only admins can update the panel');
    }
  }
}
