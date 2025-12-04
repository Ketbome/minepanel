import { Controller, Get, Post, Delete, Put, Param, Query, Body, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService, FileItem } from './files.service';
import * as fs from 'fs-extra';
import * as path from 'path';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':serverId/list')
  async listFiles(@Param('serverId') serverId: string, @Query('path') dirPath: string = ''): Promise<FileItem[]> {
    return this.filesService.listFiles(serverId, dirPath);
  }

  @Get(':serverId/read')
  async readFile(@Param('serverId') serverId: string, @Query('path') filePath: string): Promise<{ content: string; encoding: string }> {
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    return this.filesService.readFile(serverId, filePath);
  }

  @Get(':serverId/download')
  async downloadFile(@Param('serverId') serverId: string, @Query('path') filePath: string, @Res() res: Response): Promise<void> {
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }

    const fullPath = this.filesService.getFullPath(serverId, filePath);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  }

  @Get(':serverId/info')
  async getFileInfo(@Param('serverId') serverId: string, @Query('path') filePath: string): Promise<FileItem> {
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    return this.filesService.getFileInfo(serverId, filePath);
  }

  @Post(':serverId/write')
  async writeFile(@Param('serverId') serverId: string, @Body() body: { path: string; content: string }): Promise<{ success: boolean }> {
    if (!body.path) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.writeFile(serverId, body.path, body.content);
    return { success: true };
  }

  @Post(':serverId/mkdir')
  async createDirectory(@Param('serverId') serverId: string, @Body() body: { path: string }): Promise<{ success: boolean }> {
    if (!body.path) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.createDirectory(serverId, body.path);
    return { success: true };
  }

  @Post(':serverId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Param('serverId') serverId: string, @Query('path') dirPath: string = '', @UploadedFile() file: Express.Multer.File): Promise<{ success: boolean; path: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const filePath = path.join(dirPath, file.originalname);
    await this.filesService.writeFile(serverId, filePath, file.buffer.toString());

    return { success: true, path: filePath };
  }

  @Put(':serverId/rename')
  async rename(@Param('serverId') serverId: string, @Body() body: { path: string; newName: string }): Promise<{ success: boolean }> {
    if (!body.path || !body.newName) {
      throw new BadRequestException('Path and newName are required');
    }
    await this.filesService.rename(serverId, body.path, body.newName);
    return { success: true };
  }

  @Delete(':serverId/delete')
  async deleteFile(@Param('serverId') serverId: string, @Query('path') filePath: string): Promise<{ success: boolean }> {
    if (!filePath) {
      throw new BadRequestException('Path is required');
    }
    await this.filesService.deleteFile(serverId, filePath);
    return { success: true };
  }
}
