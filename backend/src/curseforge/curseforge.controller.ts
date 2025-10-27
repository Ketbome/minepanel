import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { CurseforgeService } from './curseforge.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { SettingsService } from '../users/services/settings.service';
import { PayloadToken } from 'src/auth/models/token.model';

@Controller('curseforge')
@UseGuards(JwtAuthGuard)
export class CurseforgeController {
  constructor(
    private readonly curseforgeService: CurseforgeService,
    private readonly settingsService: SettingsService,
  ) {}

  private async getApiKey(userId: number): Promise<string> {
    const settings = await this.settingsService.getSettings(userId);
    if (!settings?.cfApiKey) {
      throw new Error('CurseForge API key not configured. Please add it in settings.');
    }
    const cfApiKey = settings.cfApiKey.split('$$').join('$');
    return cfApiKey;
  }

  @Get('search')
  async searchModpacks(
    @Request() req,
    @Query('searchFilter') searchFilter?: string,
    @Query('pageSize') pageSize?: string,
    @Query('index') index?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);

    return this.curseforgeService.searchModpacks(
      apiKey,
      searchFilter,
      pageSize ? Number.parseInt(pageSize, 10) : 20,
      index ? Number.parseInt(index, 10) : 0,
      sortField ? Number.parseInt(sortField, 10) : 2,
      sortOrder || 'desc',
    );
  }

  @Get('featured')
  async getFeaturedModpacks(@Request() req, @Query('limit') limit?: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return this.curseforgeService.getFeaturedModpacks(
      apiKey,
      limit ? Number.parseInt(limit, 10) : 10,
    );
  }

  @Get('popular')
  async getPopularModpacks(@Request() req, @Query('limit') limit?: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return this.curseforgeService.getPopularModpacks(
      apiKey,
      limit ? Number.parseInt(limit, 10) : 10,
    );
  }

  @Get(':id')
  async getModpack(@Request() req, @Param('id') id: string) {
    const user = req.user as PayloadToken;
    const apiKey = await this.getApiKey(user.userId);
    return this.curseforgeService.getModpack(apiKey, Number.parseInt(id, 10));
  }
}

