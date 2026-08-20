import { BadRequestException, Controller, ForbiddenException, Get, Post, Request, UseGuards } from '@nestjs/common';
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

  @Get()
  async getVersion() {
    const [info, canSelfUpdate, lastUpdate] = await Promise.all([
      this.versionService.getVersionInfo(),
      this.updaterService.canSelfUpdate(),
      this.updaterService.getLastResult(),
    ]);

    return { ...info, canSelfUpdate, lastUpdate };
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
