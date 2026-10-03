import { Module } from '@nestjs/common';
import { SettingsModule } from 'src/settings/settings.module';
import { DiscordModule } from 'src/discord/discord.module';
import { NotificationsService } from './notifications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from 'src/users/entities/settings.entity';
import { NotificationMonitorService } from './notification-monitor.service';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';

@Module({
  imports: [SettingsModule, DiscordModule, TypeOrmModule.forFeature([Settings]), DockerComposeModule],
  providers: [NotificationsService, NotificationMonitorService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
