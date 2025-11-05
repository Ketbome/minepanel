import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerManagementController } from './controllers/server-management.controller';
import { TraefikController } from './controllers/traefik.controller';
import { ServerManagementService } from './server-management.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { DiscordModule } from 'src/discord/discord.module';
import { UsersModule } from 'src/users/users.module';
import { Settings } from 'src/users/entities/settings.entity';
import { TraefikModule } from 'src/traefik/traefik.module';

@Module({
  imports: [TypeOrmModule.forFeature([Settings]), DiscordModule, UsersModule, TraefikModule],
  controllers: [ServerManagementController, TraefikController],
  providers: [ServerManagementService, DockerComposeService],
})
export class ServerManagementModule {}
