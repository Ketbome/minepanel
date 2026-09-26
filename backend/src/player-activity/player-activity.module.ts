import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from 'src/activity/activity.module';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';
import { ServerManagementModule } from 'src/server-management/server-management.module';
import { UsersModule } from 'src/users/users.module';
import { PlayerSession, PlayerTracking } from './entities/player-session.entity';
import { PlayerActivityController } from './player-activity.controller';
import { PlayerActivityService } from './player-activity.service';
import { PlayerStatsService } from './player-stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerSession, PlayerTracking]), ActivityModule, DockerComposeModule, ServerManagementModule, UsersModule],
  providers: [PlayerActivityService, PlayerStatsService],
  controllers: [PlayerActivityController],
})
export class PlayerActivityModule {}
