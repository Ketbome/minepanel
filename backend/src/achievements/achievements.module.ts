import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAchievement } from './entities/user-achievement.entity';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserAchievement])],
  controllers: [AchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
