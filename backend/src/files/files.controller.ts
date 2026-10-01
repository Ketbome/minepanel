import { Controller, Get, Post, Delete, Put, Param, Query, Body, Res, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, Request, ParseIntPipe, HttpCode, Logger, ConflictException, ValidationPipe } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService, FileItem } from './files.service';
import { UploadSessionsService } from './upload-sessions.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';

// Always carries the RFC 5987 filename*: express's attachment() leaves it out for names
// Latin-1 can spell ("dünya.zip"), and browsers then mangle the raw bytes of filename=.
export function attachmentHeader(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

// The global pipe only validates (with implicit conversion) and passes the raw body on,
// so "10" arrived as a string and "false" validated as true. Here the body is strict
// JSON types and reaches the handler as the DTO.
export const uploadBodyPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private readonly filesService: FilesService,
    private readonly uploadSessions: UploadSessionsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  // Returns whether the caller is an admin, which lifts the global write restriction.
  private async assertFilesAccess(req, serverId: string, write: boolean): Promise<boolean> {
    const user = await this.usersService.getRequiredUserById(req.user.userId);

    if (serverId === '_root' || serverId === '.world') {
      this.accessControlService.assertGlobalFiles(user, write);
    } else {
      this.accessControlService.assertServerFiles(user, serverId, write);
    }

    return this.accessControlService.isAdmin(user);
  }

  @Get(':serverId/list')
  async listFiles(@Request() req, @Param('serverId') serverId: string, @Query('path') dirPath: string = ''): Promise<FileItem[]> {
    const admin = await this.assertFilesAccess(req, serverId, false);
    return this.filesService.listFiles(serverId, dirPath, admin);
  }

  @Get(':serverId/read')
  async readFile(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string): Promise<{ content: string; encoding: string }> {
    const admin = await this.assertFilesAccess(req, serverId, false);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    return this.filesService.readFile(serverId, filePath, admin);
  }

  @Get(':serverId/download')
  async downloadFile(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string, @Res() res: Response): Promise<void> {
    const admin = await this.assertFilesAccess(req, serverId, false);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }

    const fullPath = await this.filesService.getFullPath(serverId, filePath, admin);

    // Verificar que el archivo existe
    if (!await fs.pathExists(fullPath)) {
      throw new BadRequestException('File not found');
    }

    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      throw new BadRequestException('Cannot download a directory');
    }

    res.setHeader('Content-Disposition', attachmentHeader(path.basename(filePath)));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(fullPath);
    stream.on('error', (_err) => {
      if (!res.headersSent) {
        res.status(500).send('Error reading file');
      }
    });
    // pipe() leaves the source open when the client goes away, holding the descriptor.
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  }

  @Get(':serverId/download-zip')
  // `path` repeats for a selection (?path=a&path=b), which express parses into an array.
  async downloadZip(@Request() req, @Param('serverId') serverId: string, @Query('path') dirPath: string | string[], @Res() res: Response): Promise<void> {
    const admin = await this.assertFilesAccess(req, serverId, false);
    const paths = [dirPath ?? []].flat().filter(Boolean);
    if (paths.length === 0) {
      throw new BadRequestException('Path is required');
    }

    const { stream, name } = await this.filesService.createZipStream(serverId, paths, admin);

    res.setHeader('Content-Disposition', attachmentHeader(name));
    res.setHeader('Content-Type', 'application/zip');

    // A cancelled download must stop the archive too. abort() only drops the queued
    // files: the one being compressed stays paused on backpressure, holding its file
    // open for good, so the output is drained until that file is done.
    res.on('close', () => {
      if (res.writableFinished) return;
      stream.abort();
      // Unpiped first: pipe()'s own close handler runs after this one and would pause it again.
      stream.unpipe(res);
      stream.resume();
    });
    stream.on('warning', (error) => this.logger.warn(`Zip of ${dirPath}: ${error.message}`));
    // Headers are already out, so the only way to tell the client is to cut the transfer.
    stream.on('error', (error) => {
      this.logger.error(`Zip of ${dirPath} failed: ${error.message}`);
      res.destroy(error);
    });
    stream.pipe(res);
  }

  @Get(':serverId/info')
  async getFileInfo(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string): Promise<FileItem> {
    const admin = await this.assertFilesAccess(req, serverId, false);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    return this.filesService.getFileInfo(serverId, filePath, admin);
  }

  @Post(':serverId/write')
  async writeFile(@Request() req, @Param('serverId') serverId: string, @Body() body: { path: string; content: string }): Promise<{ success: boolean }> {
    const admin = await this.assertFilesAccess(req, serverId, true);
    if (!body.path) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.writeFile(serverId, body.path, body.content, admin);
    return { success: true };
  }

  @Post(':serverId/mkdir')
  async createDirectory(@Request() req, @Param('serverId') serverId: string, @Body() body: { path: string }): Promise<{ success: boolean }> {
    const admin = await this.assertFilesAccess(req, serverId, true);
    if (!body.path) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.createDirectory(serverId, body.path, admin);
    return { success: true };
  }

  @Post(':serverId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req,
    @Param('serverId') serverId: string,
    @Query('path') dirPath: string = '',
    @Query('relativePath') relativePath: string = '',
    @UploadedFile() file: Express.Multer.File,
    @Query('overwrite') overwrite: string = 'true',
  ): Promise<{ success: boolean; path: string }> {
    // Whatever happens below, the staged upload must not stay behind.
    try {
      const admin = await this.assertFilesAccess(req, serverId, true);
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Si viene relativePath, usarlo para preservar estructura de carpetas
      const fileName = relativePath || file.originalname;
      const filePath = path.join(dirPath, fileName);
      await this.filesService.saveUpload(serverId, filePath, file.path, admin, overwrite !== 'false');

      return { success: true, path: filePath };
    } finally {
      if (file) await fs.remove(file.path);
    }
  }

  @Post(':serverId/upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 100))
  async uploadMultipleFiles(
    @Request() req,
    @Param('serverId') serverId: string,
    @Query('path') dirPath: string = '',
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { relativePaths?: string },
    @Query('overwrite') overwrite: string = 'true',
  ): Promise<{ success: boolean; uploaded: number; errors: number; skipped: string[]; failed: string[] }> {
    try {
      const admin = await this.assertFilesAccess(req, serverId, true);
      if (!files || files.length === 0) {
        throw new BadRequestException('At least one file is required');
      }

      // relativePaths viene como JSON string desde FormData
      const relativePaths: string[] = body.relativePaths ? JSON.parse(body.relativePaths) : [];

      let uploaded = 0;
      // Names as sent, so the client can mark exactly which files did not land.
      const skipped: string[] = [];
      const failed: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const fileName = relativePaths[i] || files[i].originalname;
        try {
          await this.filesService.saveUpload(serverId, path.join(dirPath, fileName), files[i].path, admin, overwrite !== 'false');
          uploaded++;
        } catch (error) {
          (error instanceof ConflictException ? skipped : failed).push(fileName);
        }
      }

      return { success: true, uploaded, errors: failed.length, skipped, failed };
    } finally {
      await Promise.all((files ?? []).map((file) => fs.remove(file.path)));
    }
  }

  // Chunked uploads: large files are sent as raw appends so no single request carries them whole.
  @Post(':serverId/uploads')
  async createUpload(@Request() req, @Param('serverId') serverId: string, @Body(uploadBodyPipe) body: CreateUploadDto): Promise<{ id: string; offset: number }> {
    const admin = await this.assertFilesAccess(req, serverId, true);
    return this.uploadSessions.create(req.user.userId, serverId, path.join(body.path ?? '', body.name), body.size, admin, body.overwrite ?? true);
  }

  @Get(':serverId/uploads/:uploadId')
  async getUpload(@Request() req, @Param('serverId') serverId: string, @Param('uploadId') uploadId: string): Promise<{ offset: number }> {
    await this.assertFilesAccess(req, serverId, true);
    return this.uploadSessions.getOffset(req.user.userId, serverId, uploadId);
  }

  // The body is read as a stream: Nest only parses JSON and form bodies, so an
  // application/octet-stream chunk reaches here untouched.
  @Put(':serverId/uploads/:uploadId')
  async appendUpload(@Request() req, @Param('serverId') serverId: string, @Param('uploadId') uploadId: string, @Query('offset', ParseIntPipe) offset: number): Promise<{ offset: number }> {
    await this.assertFilesAccess(req, serverId, true);
    const length = req.headers['content-length'];
    return this.uploadSessions.append(req.user.userId, serverId, uploadId, offset, req, length === undefined ? undefined : Number(length));
  }

  @Post(':serverId/uploads/:uploadId/complete')
  @HttpCode(200)
  async completeUpload(@Request() req, @Param('serverId') serverId: string, @Param('uploadId') uploadId: string): Promise<{ success: boolean; path: string }> {
    const admin = await this.assertFilesAccess(req, serverId, true);
    return { success: true, ...(await this.uploadSessions.complete(req.user.userId, serverId, uploadId, admin)) };
  }

  @Delete(':serverId/uploads/:uploadId')
  async abortUpload(@Request() req, @Param('serverId') serverId: string, @Param('uploadId') uploadId: string): Promise<{ success: boolean }> {
    await this.assertFilesAccess(req, serverId, true);
    await this.uploadSessions.abort(req.user.userId, serverId, uploadId);
    return { success: true };
  }

  @Put(':serverId/rename')
  async rename(@Request() req, @Param('serverId') serverId: string, @Body() body: { path: string; newName: string }): Promise<{ success: boolean }> {
    const admin = await this.assertFilesAccess(req, serverId, true);
    if (!body.path || !body.newName) {
      throw new BadRequestException('Path and newName are required');
    }
    await this.filesService.rename(serverId, body.path, body.newName, admin);
    return { success: true };
  }

  @Delete(':serverId/delete')
  async deleteFile(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string): Promise<{ success: boolean }> {
    const admin = await this.assertFilesAccess(req, serverId, true);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.deleteFile(serverId, filePath, admin);
    return { success: true };
  }
}
