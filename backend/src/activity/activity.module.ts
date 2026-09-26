import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';
import { PlayerSession } from 'src/player-activity/entities/player-session.entity';
import { PlayersModule } from 'src/players/players.module';
import { UsersModule } from 'src/users/users.module';
import { ActivityTailerService } from './activity-tailer.service';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityEvent } from './entities/activity-event.entity';
import { InventorySnapshot } from './entities/inventory-snapshot.entity';
import { LogCursor } from './entities/log-cursor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityEvent, PlayerSession, LogCursor, InventorySnapshot]), DockerComposeModule, PlayersModule, UsersModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityTailerService],
  exports: [ActivityService],
})
export class ActivityModule {}
