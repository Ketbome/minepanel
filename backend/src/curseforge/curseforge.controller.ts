import { BadRequestException, Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { CurseforgeService } from './curseforge.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { SettingsService } from '../users/services/settings.service';
import { PayloadToken } from 'src/auth/models/token.model';
import { SearchCurseforgeModsQueryDto } from './dto/search-mods.query.dto';
import { ModVersionsQueryDto } from './dto/mod-versions.query.dto';

@Controller('curseforge')
@UseGuards(JwtAuthGuard)
export class CurseforgeController {
  constructor(
    private readonly curseforgeService: CurseforgeService,
    private readonly settingsService: SettingsService,
  ) {}

  private async getApiKey(userId: number): Promise<string> {
    const cfApiKey = await this.settingsService.getCfApiKey(userId);
    if (!cfApiKey) {
      throw new BadRequestException('CurseForge API key not configured. Please add it in settings.');
    }
    return cfApiKey;
  }

  @Get('search')
  async searchModpacks(@Request() req, @Query('searchFilter') searchFilter?: string, @Query('pageSize') pageSize?: string, @Query('index') index?: string, @Query('sortField') sortField?: string, @Query('sortOrder') sortOrder?: 'asc' | 'desc') {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);

    return this.curseforgeService.searchModpacks(apiKey, searchFilter, pageSize ? Number.parseInt(pageSize, 10) : 20, index ? Number.parseInt(index, 10) : 0, sortField ? Number.parseInt(sortField, 10) : 2, sortOrder || 'desc');
  }

  @Get('featured')
  async getFeaturedModpacks(@Request() req, @Query('limit') limit?: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return this.curseforgeService.getFeaturedModpacks(apiKey, limit ? Number.parseInt(limit, 10) : 10);
  }

  @Get('popular')
  async getPopularModpacks(@Request() req, @Query('limit') limit?: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return this.curseforgeService.getPopularModpacks(apiKey, limit ? Number.parseInt(limit, 10) : 10);
  }

  @Get('mods/search')
  async searchMods(@Request() req, @Query() query: SearchCurseforgeModsQueryDto) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);

    return this.curseforgeService.searchMods(apiKey, {
      q: query.q,
      pageSize: query.pageSize,
      index: query.index,
      minecraftVersion: query.minecraftVersion,
      loader: query.loader,
    });
  }

  @Get('mods/resolve')
  async resolveMods(@Request() req, @Query('refs') refs?: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    const parsed = (refs ?? '').split(',');

    return { data: await this.curseforgeService.resolveMods(apiKey, parsed) };
  }

  @Get('modpacks/:ref')
  async resolveModpack(@Request() req, @Param('ref') ref: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return this.curseforgeService.resolveModpack(apiKey, ref);
  }

  @Get('modpacks/:ref/files')
  async getModpackFiles(@Request() req, @Param('ref') ref: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return { data: await this.curseforgeService.getModpackFiles(apiKey, ref) };
  }

  @Get('mods/latest')
  async getLatestModVersions(@Request() req, @Query() query: ModVersionsQueryDto, @Query('refs') refs?: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);

    return {
      data: await this.curseforgeService.getLatestVersions(apiKey, (refs ?? '').split(','), {
        minecraftVersion: query.minecraftVersion,
        loader: query.loader,
      }),
    };
  }

  @Get('mods/files/resolve')
  async resolveModFiles(@Request() req, @Query('ids') ids?: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);

    return { data: await this.curseforgeService.resolveModFiles(apiKey, (ids ?? '').split(',')) };
  }

  @Get('mods/:ref/versions')
  async getModVersions(@Request() req, @Param('ref') ref: string, @Query() query: ModVersionsQueryDto) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);

    return {
      data: await this.curseforgeService.getModVersions(apiKey, ref, {
        minecraftVersion: query.minecraftVersion,
        loader: query.loader,
      }),
    };
  }

  @Get(':id')
  async getModpack(@Request() req, @Param('id') id: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return this.curseforgeService.getModpack(apiKey, Number.parseInt(id, 10));
  }
}
