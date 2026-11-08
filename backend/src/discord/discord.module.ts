import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';
import { SettingsModule } from 'src/settings/settings.module';
import { Settings } from 'src/users/entities/settings.entity';
import { DiscordService } from './discord.service';
import { DiscordFeedService } from './discord-feed.service';
import { DiscordRoutingService } from './discord-routing.service';
import { DiscordRoute } from './entities/discord-route.entity';
import { DiscordWebhook } from './entities/discord-webhook.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordWebhook, DiscordRoute, Settings]), SettingsModule, DockerComposeModule],
  providers: [DiscordService, DiscordRoutingService, DiscordFeedService],
  exports: [DiscordService, DiscordRoutingService, DiscordFeedService],
})
export class DiscordModule {}
