import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { LogPreset } from './entities/log-preset.entity';
import { LogPresetsController } from './log-presets.controller';
import { LogPresetsService } from './log-presets.service';
import { ServerManagementModule } from 'src/server-management/server-management.module';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';

@Module({
  imports: [TypeOrmModule.forFeature([LogPreset]), UsersModule, ServerManagementModule, DockerComposeModule],
  controllers: [LogPresetsController],
  providers: [LogPresetsService],
})
export class LogPresetsModule {}
