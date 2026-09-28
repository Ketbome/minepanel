import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EndRun } from './entities/end-run.entity';
import { EndRunsController } from './end-runs.controller';
import { EndRunsService } from './end-runs.service';

@Module({
  imports: [TypeOrmModule.forFeature([EndRun])],
  controllers: [EndRunsController],
  providers: [EndRunsService],
})
export class EndRunsModule {}
