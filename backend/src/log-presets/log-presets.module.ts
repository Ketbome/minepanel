import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { LogPreset } from './entities/log-preset.entity';
import { LogPresetsController } from './log-presets.controller';
import { LogPresetsService } from './log-presets.service';

@Module({
  imports: [TypeOrmModule.forFeature([LogPreset]), UsersModule],
  controllers: [LogPresetsController],
  providers: [LogPresetsService],
})
export class LogPresetsModule {}
