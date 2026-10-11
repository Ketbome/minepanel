import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { SettingsController } from './controllers/settings.controller';
import { Settings } from './entities/settings.entity';
import { SettingsService } from './services/settings.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { DiscordModule } from 'src/discord/discord.module';
import { UserInvitation } from './entities/user-invitation.entity';
import { AccessControlService } from './services/access-control.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { PendingEmailChange } from './entities/pending-email-change.entity';
import { SettingsModule } from 'src/settings/settings.module';
import { ProxyModule } from 'src/proxy/proxy.module';
import { IntegrationSettingsController } from './controllers/integration-settings.controller';
import { CurseforgeModule } from 'src/curseforge/curseforge.module';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Settings, UserInvitation, AuditLog, PendingEmailChange]), DiscordModule, NotificationsModule, SettingsModule, forwardRef(() => ProxyModule), forwardRef(() => CurseforgeModule)],
  controllers: [UsersController, SettingsController, AuditLogController, IntegrationSettingsController],
  providers: [UsersService, SettingsService, AccessControlService, AuditLogService],
  exports: [UsersService, SettingsService, AccessControlService, AuditLogService],
})
export class UsersModule {}
