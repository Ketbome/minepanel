import { Module } from '@nestjs/common';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerManagementController } from './server-management.controller';
import { AutoScaleController } from './auto-scale.controller';
import { ServerManagementService } from './server-management.service';
import { DiscordModule } from 'src/discord/discord.module';
import { UsersModule } from 'src/users/users.module';
import { ProxyModule } from 'src/proxy/proxy.module';
import { BedrockAddonsModule } from 'src/bedrock-addons/bedrock-addons.module';
import { Settings } from 'src/users/entities/settings.entity';
import { AlertsModule } from 'src/alerts/alerts.module';
import { SettingsModule } from 'src/settings/settings.module';
import { ModMetadataModule } from 'src/mod-metadata/mod-metadata.module';

@Module({
  // ModMetadataModule (not just ModMetadataService) so ServerManagementService shares the same
  // ModMetadataService instance as ModMetadataController — the queue's per-server lock only holds
  // within a single instance.
  imports: [DockerComposeModule, TypeOrmModule.forFeature([Settings]), DiscordModule, UsersModule, ProxyModule, BedrockAddonsModule, AlertsModule, SettingsModule, ModMetadataModule],
  controllers: [ServerManagementController, AutoScaleController],
  providers: [ServerManagementService],
  exports: [ServerManagementService],
})
export class ServerManagementModule {}
