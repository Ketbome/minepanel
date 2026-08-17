import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ModrinthService } from './modrinth.service';
import { SearchModrinthModsQueryDto } from './dto/search-mods.query.dto';
import { ProjectVersionsQueryDto } from './dto/project-versions.query.dto';

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

  @Get('projects/resolve')
  async resolveProjects(@Query('refs') refs?: string) {
    const parsed = (refs ?? '').split(',');
    return { data: await this.modrinthService.resolveProjects(parsed) };
  }

  @Get('projects/latest')
  async getLatestProjectVersions(@Query() query: ProjectVersionsQueryDto, @Query('refs') refs?: string) {
    return {
      data: await this.modrinthService.getLatestVersions((refs ?? '').split(','), {
        minecraftVersion: query.minecraftVersion,
        loader: query.loader,
      }),
    };
  }

  @Get('versions/resolve')
  async resolveVersions(@Query('ids') ids?: string) {
    return { data: await this.modrinthService.resolveVersions((ids ?? '').split(',')) };
  }

  @Get('projects/:ref/versions')
  async getProjectVersions(@Param('ref') ref: string, @Query() query: ProjectVersionsQueryDto) {
    return {
      data: await this.modrinthService.getProjectVersions(ref, {
        minecraftVersion: query.minecraftVersion,
        loader: query.loader,
      }),
    };
  }
}
