import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstanceSettings } from './entities/instance-settings.entity';
import { InstanceSettingsService } from './instance-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([InstanceSettings])],
  providers: [InstanceSettingsService],
  exports: [InstanceSettingsService],
})
export class SettingsModule {}
