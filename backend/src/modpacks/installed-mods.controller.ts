import { Controller, Get, Param, Request } from '@nestjs/common';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { ModpacksService } from './modpacks.service';

@Controller('servers/:serverId/installed-mods')
export class InstalledModsController {
  constructor(
    private readonly modpacksService: ModpacksService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get()
  async list(@Request() req, @Param('serverId') serverId: string) {
    this.accessControlService.assertServerFiles(await this.usersService.getRequestUser(req.user), serverId, false);
    return this.modpacksService.scanInstalledMods(serverId);
  }
}
