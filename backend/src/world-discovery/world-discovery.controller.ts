import { Body, Controller, Get, Post, Query, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { ImportWorldDto } from './dto/import-world.dto';
import { SearchWorldsQueryDto } from './dto/search-worlds.query.dto';
import { WorldDiscoveryService } from './world-discovery.service';

@Controller('world-discovery')
@UseGuards(JwtAuthGuard)
export class WorldDiscoveryController {
  constructor(private readonly worldDiscoveryService: WorldDiscoveryService) {}

  @Get('search')
  async searchWorlds(@Request() req, @Query(new ValidationPipe({ transform: true })) query: SearchWorldsQueryDto) {
    const user = req.user as PayloadToken;

    if (query.provider === 'curseforge') {
      return this.worldDiscoveryService.searchCurseForgeWorlds(user.userId, {
        q: query.q,
        pageSize: query.pageSize,
        index: query.index,
      });
    }

    return { data: [], pagination: { index: 0, pageSize: 0, resultCount: 0, totalCount: 0 } };
  }

  @Post('import')
  async importWorld(
    @Request() req,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) body: ImportWorldDto,
  ) {
    const user = req.user as PayloadToken;

    if (body.provider === 'curseforge') {
      return this.worldDiscoveryService.importFromCurseForge(user.userId, {
        projectId: body.projectId!,
        fileId: body.fileId,
        targetFolder: body.targetFolder,
      });
    }

    return this.worldDiscoveryService.importFromUrl({
      downloadUrl: body.downloadUrl!,
      fileName: body.fileName,
      targetFolder: body.targetFolder,
    });
  }
}
