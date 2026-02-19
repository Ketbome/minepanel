
import { Controller, Get, Post, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SftpService } from './sftp.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ServerManagementService } from 'src/server-management/server-management.service';

@Controller('server-management/servers/:id/sftp')
@UseGuards(JwtAuthGuard)
export class SftpController {
    constructor(
        private readonly sftpService: SftpService,
        private readonly serverManagementService: ServerManagementService,
    ) { }

    @Get('status')
    async getStatus(@Param('id') id: string, @Request() req) {
        // Ideally verify ownership here
        return this.sftpService.getStatus(id, req.user);
    }

    @Post('enable')
    async enableSftp(@Param('id') id: string, @Request() req) {
        return this.sftpService.enableSftp(id, req.user);
    }

    @Post('disable')
    async disableSftp(@Param('id') id: string, @Request() req) {
        return this.sftpService.disableSftp(id, req.user);
    }
}
