import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { PayloadToken } from 'src/auth/models/token.model';
import { AchievementsService } from './achievements.service';
import { UnlockAchievementDto } from './dto/unlock-achievement.dto';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  list(@Request() req) {
    return this.achievementsService.list((req.user as PayloadToken).userId);
  }

  @Post()
  unlock(@Request() req, @Body() dto: UnlockAchievementDto) {
    return this.achievementsService.unlock((req.user as PayloadToken).userId, dto.key);
  }
}
