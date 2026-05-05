import { Controller, Get, Post, Delete, Put, Param, Query, Body, Res, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService, FileItem } from './files.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private async assertFilesAccess(req, serverId: string, write: boolean) {
    const user = await this.usersService.getRequiredUserById(req.user.userId);

    if (serverId === '_root' || serverId === '.world') {
      this.accessControlService.assertGlobalFiles(user, write);
      return;
    }

    this.accessControlService.assertServerFiles(user, serverId, write);
  }

  @Get(':serverId/list')
  async listFiles(@Request() req, @Param('serverId') serverId: string, @Query('path') dirPath: string = ''): Promise<FileItem[]> {
    await this.assertFilesAccess(req, serverId, false);
    return this.filesService.listFiles(serverId, dirPath);
  }

  @Get(':serverId/read')
  async readFile(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string): Promise<{ content: string; encoding: string }> {
    await this.assertFilesAccess(req, serverId, false);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    return this.filesService.readFile(serverId, filePath);
  }

  @Get(':serverId/download')
  async downloadFile(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string, @Res() res: Response): Promise<void> {
    await this.assertFilesAccess(req, serverId, false);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }

    const fullPath = this.filesService.getFullPath(serverId, filePath);

    // Verificar que el archivo existe
    if (!await fs.pathExists(fullPath)) {
      throw new BadRequestException('File not found');
    }

    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      throw new BadRequestException('Cannot download a directory');
    }

    const fileName = path.basename(filePath);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(fullPath);
    stream.on('error', (_err) => {
      if (!res.headersSent) {
        res.status(500).send('Error reading file');
      }
    });
    stream.pipe(res);
  }

  @Get(':serverId/download-zip')
  async downloadZip(@Request() req, @Param('serverId') serverId: string, @Query('path') dirPath: string, @Res() res: Response): Promise<void> {
    await this.assertFilesAccess(req, serverId, false);
    if (!dirPath) {
      throw new BadRequestException('Path is required');
    }

    const { stream, name } = await this.filesService.createZipStream(serverId, dirPath);

    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Content-Type', 'application/zip');

    stream.pipe(res);
  }

  @Get(':serverId/info')
  async getFileInfo(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string): Promise<FileItem> {
    await this.assertFilesAccess(req, serverId, false);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    return this.filesService.getFileInfo(serverId, filePath);
  }

  @Post(':serverId/write')
  async writeFile(@Request() req, @Param('serverId') serverId: string, @Body() body: { path: string; content: string }): Promise<{ success: boolean }> {
    await this.assertFilesAccess(req, serverId, true);
    if (!body.path) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.writeFile(serverId, body.path, body.content);
    return { success: true };
  }

  @Post(':serverId/mkdir')
  async createDirectory(@Request() req, @Param('serverId') serverId: string, @Body() body: { path: string }): Promise<{ success: boolean }> {
    await this.assertFilesAccess(req, serverId, true);
    if (!body.path) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.createDirectory(serverId, body.path);
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
  ): Promise<{ success: boolean; path: string }> {
    await this.assertFilesAccess(req, serverId, true);
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Si viene relativePath, usarlo para preservar estructura de carpetas
    const fileName = relativePath || file.originalname;
    const filePath = path.join(dirPath, fileName);
    await this.filesService.writeFileBuffer(serverId, filePath, file.buffer);

    return { success: true, path: filePath };
  }

  @Post(':serverId/upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 100))
  async uploadMultipleFiles(
    @Request() req,
    @Param('serverId') serverId: string,
    @Query('path') dirPath: string = '',
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { relativePaths?: string },
  ): Promise<{ success: boolean; uploaded: number; errors: number }> {
    await this.assertFilesAccess(req, serverId, true);
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    // relativePaths viene como JSON string desde FormData
    const relativePaths: string[] = body.relativePaths ? JSON.parse(body.relativePaths) : [];

    let uploaded = 0;
    let errors = 0;

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const fileName = relativePaths[i] || file.originalname;
        const filePath = path.join(dirPath, fileName);
        await this.filesService.writeFileBuffer(serverId, filePath, file.buffer);
        uploaded++;
      } catch {
        errors++;
      }
    }

    return { success: true, uploaded, errors };
  }

  @Put(':serverId/rename')
  async rename(@Request() req, @Param('serverId') serverId: string, @Body() body: { path: string; newName: string }): Promise<{ success: boolean }> {
    await this.assertFilesAccess(req, serverId, true);
    if (!body.path || !body.newName) {
      throw new BadRequestException('Path and newName are required');
    }
    await this.filesService.rename(serverId, body.path, body.newName);
    return { success: true };
  }

  @Delete(':serverId/delete')
  async deleteFile(@Request() req, @Param('serverId') serverId: string, @Query('path') filePath: string): Promise<{ success: boolean }> {
    await this.assertFilesAccess(req, serverId, true);
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.deleteFile(serverId, filePath);
    return { success: true };
  }
}
