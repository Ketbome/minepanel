import { Controller, Get, NotFoundException, Param, Query, Request, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { Public } from 'src/auth/decorators/public.decorator';
import { ItemTexturesService } from './item-textures.service';
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

// Public so <img> tags can load them without credentials; it only serves already-cached
// vanilla textures and never triggers a download (that needs an authenticated profile read).
@Controller('item-textures')
export class ItemTexturesController {
  constructor(private readonly textures: ItemTexturesService) {}

  @Public()
  @Get(':version/:item')
  async texture(@Param('version') version: string, @Param('item') item: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.textures.resolve(version, item);
    if (!file) throw new NotFoundException();
    // Only a found texture is immutable: a 404 means "not downloaded yet" and must not be cached.
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return new StreamableFile(createReadStream(file), { type: 'image/png' });
  }
}
