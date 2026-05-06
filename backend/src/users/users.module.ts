import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { SettingsController } from './controllers/settings.controller';
import { Settings } from './entities/settings.entity';
import { SettingsService } from './services/settings.service';
import { DiscordModule } from 'src/discord/discord.module';
import { UserInvitation } from './entities/user-invitation.entity';
import { AccessControlService } from './services/access-control.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogController } from './controllers/audit-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Settings, UserInvitation, AuditLog]), DiscordModule],
  controllers: [UsersController, SettingsController, AuditLogController],
  providers: [UsersService, SettingsService, AccessControlService, AuditLogService],
  exports: [UsersService, SettingsService, AccessControlService, AuditLogService],
})
export class UsersModule {}
