
import { Module } from '@nestjs/common';
import { SftpService } from './sftp.service';
import { SftpController } from './sftp.controller';
import { AuthModule } from 'src/auth/auth.module';
import { ServerManagementModule } from 'src/server-management/server-management.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [AuthModule, ServerManagementModule, ConfigModule, UsersModule],
    controllers: [SftpController],
    providers: [SftpService],
})
export class SftpModule { }
