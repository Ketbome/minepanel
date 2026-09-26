import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { PlayersService } from './players.service';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get(':serverId')
  async list(@Request() req, @Param('serverId') serverId: string) {
    await this.assertServerAccess(req, serverId);
    return this.playersService.list(serverId);
  }

  @Get(':serverId/items/search')
  async searchItems(@Request() req, @Param('serverId') serverId: string, @Query('q') q = '') {
    await this.assertServerAccess(req, serverId);
    return this.playersService.searchItems(serverId, q);
  }

  @Get(':serverId/:uuid')
  async profile(@Request() req, @Param('serverId') serverId: string, @Param('uuid') uuid: string) {
    await this.assertServerAccess(req, serverId);
    return this.playersService.profile(serverId, uuid);
  }

  private async assertServerAccess(req, serverId: string): Promise<void> {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    this.accessControlService.assertServerAccess(user, serverId);
  }
}
