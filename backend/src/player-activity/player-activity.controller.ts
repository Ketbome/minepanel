import { BadRequestException, Controller, Get, Param, Query, Request } from '@nestjs/common';
import { PayloadToken } from 'src/auth/models/token.model';
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { PlayerActivityService } from './player-activity.service';

@Controller('servers/:id/player-activity')
export class PlayerActivityController {
  constructor(private readonly activity: PlayerActivityService, private readonly users: UsersService, private readonly access: AccessControlService) {}

  private async authorize(req: { user: PayloadToken }, id: string, page?: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new BadRequestException('Invalid server ID');
    const user = await this.users.getRequiredUserById(req.user.userId);
    this.access.assertServerAccess(user, id);
    const parsed = Number(page ?? 0);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 100_000) throw new BadRequestException('Invalid page');
    return parsed;
  }

  @Get()
  async list(@Request() req, @Param('id') id: string, @Query('page') page?: string) {
    return this.activity.list(id, await this.authorize(req, id, page));
  }

  @Get(':key')
  async detail(@Request() req, @Param('id') id: string, @Param('key') key: string, @Query('page') page?: string) {
    const parsed = await this.authorize(req, id, page);
    if (!/^(?:java:[a-z0-9_.-]{1,32}|bedrock:\d{1,20})$/.test(key)) throw new BadRequestException('Invalid player key');
    return this.activity.detail(id, key, parsed);
  }
}
