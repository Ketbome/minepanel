import { Controller, Get, Post, Delete, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs-extra';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { BackupService } from './backup.service';

@Controller('servers/:serverId/backups')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  async listBackups(@Param('serverId') serverId: string) {
    return this.backupService.listBackups(serverId);
  }

  @Post('trigger')
  async triggerBackup(@Param('serverId') serverId: string) {
    await this.backupService.triggerBackup(serverId);
    return { success: true, message: 'Backup triggered successfully' };
  }

  @Post(':filename/restore')
  async restoreBackup(@Param('serverId') serverId: string, @Param('filename') filename: string) {
    await this.backupService.restoreBackup(serverId, filename);
    return { success: true, message: 'Backup restored successfully' };
  }

  @Get(':filename/download')
  async downloadBackup(@Param('serverId') serverId: string, @Param('filename') filename: string, @Res() res: Response) {
    const filePath = await this.backupService.getBackupFilePath(serverId, filename);
    const stat = await fs.stat(filePath);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (_err) => {
      if (!res.headersSent) {
        res.status(500).send('Error reading file');
      }
    });
    stream.pipe(res);
  }

  @Delete(':filename')
  async deleteBackup(@Param('serverId') serverId: string, @Param('filename') filename: string) {
    await this.backupService.deleteBackup(serverId, filename);
    return { success: true, message: 'Backup deleted successfully' };
  }
}
