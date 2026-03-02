import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ModrinthService } from './modrinth.service';
import { SearchModrinthModsQueryDto } from './dto/search-mods.query.dto';

@Controller('modrinth')
@UseGuards(JwtAuthGuard)
export class ModrinthController {
  constructor(private readonly modrinthService: ModrinthService) {}

  @Get('mods/search')
  async searchMods(@Query() query: SearchModrinthModsQueryDto) {
    return this.modrinthService.searchMods({
      q: query.q,
      limit: query.limit,
      offset: query.offset,
      minecraftVersion: query.minecraftVersion,
      loader: query.loader,
    });
  }
}
