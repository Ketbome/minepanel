import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseFilePipeBuilder, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { uploadBodyPipe } from 'src/files/files.controller';
import { UploadSessionsService } from 'src/files/upload-sessions.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { CreateModpackUploadDto } from './dto/create-modpack-upload.dto';
import { MAX_MODPACK_SIZE, ModpacksService } from './modpacks.service';

@Controller('servers/:serverId/modpacks')
@UseGuards(JwtAuthGuard)
export class ModpacksController {
  constructor(
    private readonly modpacksService: ModpacksService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly uploadSessions: UploadSessionsService,
  ) {}

  @Get()
  async list(@Request() req, @Param('serverId') serverId: string) {
    await this.assertAccess(req, serverId, false);
    return this.modpacksService.list(serverId);
  }

  @Post()
  // Multer buffers the whole upload before the pipe runs, so the ceiling has to be here too.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MODPACK_SIZE } }))
  async upload(
    @Request() req,
    @Param('serverId') serverId: string,
    @UploadedFile(new ParseFilePipeBuilder().addMaxSizeValidator({ maxSize: MAX_MODPACK_SIZE }).build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    await this.assertAccess(req, serverId, true);
    return this.modpacksService.save(serverId, file);
  }

  // Large archives go up in chunks past proxy body limits (Cloudflare: 100 MB). Chunks,
  // offsets and aborts use the file manager's routes (/files/:serverId/uploads/:id);
  // only opening and finishing an upload is specific to modpacks.
  @Post('uploads')
  async createUpload(@Request() req, @Param('serverId') serverId: string, @Body(uploadBodyPipe) body: CreateModpackUploadDto) {
    await this.assertAccess(req, serverId, true);
    return this.uploadSessions.createFor('modpack', req.user.userId, serverId, body.name, body.size, () => this.modpacksService.assertUploadTarget(serverId, body.name));
  }

  @Post('uploads/:uploadId/complete')
  @HttpCode(200)
  async completeUpload(@Request() req, @Param('serverId') serverId: string, @Param('uploadId') uploadId: string) {
    await this.assertAccess(req, serverId, true);
    return this.uploadSessions.completeFor('modpack', req.user.userId, serverId, uploadId, (staged, session) => this.modpacksService.saveStaged(serverId, session.path, staged));
  }

  @Get(':fileName/inspect')
  async inspect(@Request() req, @Param('serverId') serverId: string, @Param('fileName') fileName: string) {
    await this.assertAccess(req, serverId, false);
    return this.modpacksService.inspect(serverId, fileName);
  }

  @Get(':fileName/mods')
  async scanMods(@Request() req, @Param('serverId') serverId: string, @Param('fileName') fileName: string) {
    await this.assertAccess(req, serverId, false);
    return this.modpacksService.scanMods(serverId, fileName);
  }

  @Post(':fileName/strip')
  async stripMods(@Request() req, @Param('serverId') serverId: string, @Param('fileName') fileName: string, @Body() body: { entries?: string[] }) {
    await this.assertAccess(req, serverId, true);

    if (!Array.isArray(body?.entries) || body.entries.some((entry) => typeof entry !== 'string')) {
      throw new BadRequestException('entries must be a list of archive paths');
    }

    return this.modpacksService.stripMods(serverId, fileName, body.entries);
  }

  @Delete(':fileName')
  async remove(@Request() req, @Param('serverId') serverId: string, @Param('fileName') fileName: string) {
    await this.assertAccess(req, serverId, true);
    await this.modpacksService.remove(serverId, fileName);
    return { success: true };
  }

  private async assertAccess(req, serverId: string, write: boolean) {
    const user = await this.usersService.getRequiredUserById(req.user.userId);
    this.accessControlService.assertServerFiles(user, serverId, write);
  }
}
