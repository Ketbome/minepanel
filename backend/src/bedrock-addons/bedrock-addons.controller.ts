import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { BedrockAddonsService } from './bedrock-addons.service';
import { SearchBedrockAddonsQueryDto } from './dto/search-bedrock-addons.query.dto';
import { ImportBedrockAddonDto } from './dto/import-bedrock-addon.dto';

const MAX_BEDROCK_ADDON_UPLOAD_SIZE = 128 * 1024 * 1024;

@Controller('bedrock-addons')
@UseGuards(JwtAuthGuard)
export class BedrockAddonsController {
  constructor(private readonly bedrockAddonsService: BedrockAddonsService) {}

  @Get(':serverId')
  async listAddons(@Param('serverId') serverId: string) {
    return this.bedrockAddonsService.listAddons(serverId);
  }

  @Post(':serverId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAddon(
    @Param('serverId') serverId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_BEDROCK_ADDON_UPLOAD_SIZE })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.bedrockAddonsService.importUploadedAddon(serverId, file);
  }

  @Get(':serverId/curseforge/search')
  async searchCurseForgeAddons(
    @Request() req,
    @Param('serverId') serverId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: SearchBedrockAddonsQueryDto,
  ) {
    const user = req.user as PayloadToken;
    return this.bedrockAddonsService.searchCurseForgeAddons(user.userId, serverId, query);
  }

  @Post(':serverId/curseforge/import')
  async importCurseForgeAddon(
    @Request() req,
    @Param('serverId') serverId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) body: ImportBedrockAddonDto,
    @Query('enable') enable?: string,
  ) {
    const user = req.user as PayloadToken;
    return this.bedrockAddonsService.importCurseForgeAddon(user.userId, serverId, body, enable === 'true');
  }

  @Post(':serverId/:addonId/enable')
  async enableAddon(@Param('serverId') serverId: string, @Param('addonId') addonId: string) {
    return this.bedrockAddonsService.setAddonEnabled(serverId, addonId, true);
  }

  @Post(':serverId/:addonId/disable')
  async disableAddon(@Param('serverId') serverId: string, @Param('addonId') addonId: string) {
    return this.bedrockAddonsService.setAddonEnabled(serverId, addonId, false);
  }

  @Delete(':serverId/:addonId')
  async deleteAddon(@Param('serverId') serverId: string, @Param('addonId') addonId: string) {
    return this.bedrockAddonsService.deleteAddon(serverId, addonId);
  }
}
