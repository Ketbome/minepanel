import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstanceSettings } from './entities/instance-settings.entity';
import { Settings } from '../users/entities/settings.entity';
import { InstanceSettingsService } from './instance-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([InstanceSettings, Settings])],
  providers: [InstanceSettingsService],
  exports: [InstanceSettingsService],
})
export class SettingsModule {}
