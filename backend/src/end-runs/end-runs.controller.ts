import { BadRequestException, Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { PayloadToken } from 'src/auth/models/token.model';
import { EndRunsService } from './end-runs.service';
import { RUN_MODES, SubmitRunDto, type RunMode } from './dto/submit-run.dto';

@Controller('end-runs')
export class EndRunsController {
  constructor(private readonly endRunsService: EndRunsService) {}

  @Post()
  submit(@Request() req, @Body() dto: SubmitRunDto) {
    return this.endRunsService.submit((req.user as PayloadToken).userId, dto);
  }

  @Get('leaderboard')
  leaderboard(@Request() req, @Query('mode') mode: string) {
    if (!(RUN_MODES as readonly string[]).includes(mode)) throw new BadRequestException('Unknown mode');
    return this.endRunsService.leaderboard((req.user as PayloadToken).userId, mode as RunMode);
  }
}
