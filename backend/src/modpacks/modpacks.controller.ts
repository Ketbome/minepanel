import { Controller, Delete, Get, Param, ParseFilePipeBuilder, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { MAX_MODPACK_SIZE, ModpacksService } from './modpacks.service';

@Controller('servers/:serverId/modpacks')
@UseGuards(JwtAuthGuard)
export class ModpacksController {
  constructor(
    private readonly modpacksService: ModpacksService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
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
