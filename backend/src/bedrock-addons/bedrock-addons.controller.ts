import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Put,
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
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { BedrockAddonsService, MAX_BEDROCK_ADDON_SIZE } from './bedrock-addons.service';
import { SearchBedrockAddonsQueryDto } from './dto/search-bedrock-addons.query.dto';
import { ImportBedrockAddonDto } from './dto/import-bedrock-addon.dto';
import { ReorderBedrockAddonsDto } from './dto/reorder-bedrock-addons.dto';

@Controller('bedrock-addons')
@UseGuards(JwtAuthGuard)
export class BedrockAddonsController {
  constructor(
    private readonly bedrockAddonsService: BedrockAddonsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private async assertServerAccess(req, serverId: string) {
    const user = await this.usersService.getRequiredUserById((req.user as PayloadToken).userId);
    this.accessControlService.assertServerAccess(user, serverId);
  }

  @Get(':serverId')
  async listAddons(@Request() req, @Param('serverId') serverId: string) {
    await this.assertServerAccess(req, serverId);
    return this.bedrockAddonsService.listAddons(serverId);
  }

  @Post(':serverId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAddon(
    @Request() req,
    @Param('serverId') serverId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_BEDROCK_ADDON_SIZE })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    await this.assertServerAccess(req, serverId);
    return this.bedrockAddonsService.importUploadedAddon(serverId, file);
  }

  @Get(':serverId/curseforge/search')
  async searchCurseForgeAddons(
    @Request() req,
    @Param('serverId') serverId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: SearchBedrockAddonsQueryDto,
  ) {
    await this.assertServerAccess(req, serverId);
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
    await this.assertServerAccess(req, serverId);
    const user = req.user as PayloadToken;
    return this.bedrockAddonsService.importCurseForgeAddon(user.userId, serverId, body, enable === 'true');
  }

  @Put(':serverId/order')
  async reorderAddons(
    @Request() req,
    @Param('serverId') serverId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) body: ReorderBedrockAddonsDto,
  ) {
    await this.assertServerAccess(req, serverId);
    return this.bedrockAddonsService.reorderAddons(serverId, body.addonIds);
  }

  @Post(':serverId/:addonId/enable')
  async enableAddon(@Request() req, @Param('serverId') serverId: string, @Param('addonId') addonId: string) {
    await this.assertServerAccess(req, serverId);
    return this.bedrockAddonsService.setAddonEnabled(serverId, addonId, true);
  }

  @Post(':serverId/:addonId/disable')
  async disableAddon(@Request() req, @Param('serverId') serverId: string, @Param('addonId') addonId: string) {
    await this.assertServerAccess(req, serverId);
    return this.bedrockAddonsService.setAddonEnabled(serverId, addonId, false);
  }

  @Delete(':serverId/:addonId')
  async deleteAddon(@Request() req, @Param('serverId') serverId: string, @Param('addonId') addonId: string) {
    await this.assertServerAccess(req, serverId);
    return this.bedrockAddonsService.deleteAddon(serverId, addonId);
  }
}
