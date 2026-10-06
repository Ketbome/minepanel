import { Body, Controller, Delete, Get, Put, Query, Request } from '@nestjs/common';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { LogPresetsService } from './log-presets.service';
import { SaveLogPresetDto } from './dto/save-log-preset.dto';

@Controller('log-presets')
export class LogPresetsController {
  constructor(
    private readonly presets: LogPresetsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private async authorize(req, serverId: string): Promise<number> {
    const { userId } = req.user as PayloadToken;
    this.accessControlService.assertServerAccess(await this.usersService.getRequiredUserById(userId), serverId);
    return userId;
  }

  @Get()
  async list(@Request() req, @Query('serverId') serverId: string) {
    return this.presets.list(await this.authorize(req, serverId), serverId);
  }

  @Put()
  async save(@Request() req, @Body() dto: SaveLogPresetDto) {
    return this.presets.save(await this.authorize(req, dto.serverId), dto);
  }

  @Delete()
  async remove(@Request() req, @Query('serverId') serverId: string, @Query('name') name: string) {
    await this.presets.remove(await this.authorize(req, serverId), serverId, name);
  }
}
