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
import { PendingEmailChange } from './entities/pending-email-change.entity';
import { AuthMailService } from 'src/auth/auth-mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Settings, UserInvitation, AuditLog, PendingEmailChange]), DiscordModule],
  controllers: [UsersController, SettingsController, AuditLogController],
  providers: [UsersService, SettingsService, AccessControlService, AuditLogService, AuthMailService],
  exports: [UsersService, SettingsService, AccessControlService, AuditLogService],
})
export class UsersModule {}
