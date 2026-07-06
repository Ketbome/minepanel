import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertConfig } from './entities/alert-config.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Settings } from 'src/users/entities/settings.entity';
import { DiscordModule } from 'src/discord/discord.module';
import { UsersModule } from 'src/users/users.module';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';

@Module({
  imports: [TypeOrmModule.forFeature([AlertConfig, Settings]), DiscordModule, UsersModule],
  controllers: [AlertsController],
  providers: [AlertsService, DockerComposeService],
  exports: [AlertsService],
})
export class AlertsModule {}
