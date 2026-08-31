import { Module } from '@nestjs/common';
import { SystemMonitoringController } from './system-monitoring.controller';
import { SystemMonitoringService } from './system-monitoring.service';
import { SettingsModule } from 'src/settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [SystemMonitoringController],
  providers: [SystemMonitoringService],
  exports: [SystemMonitoringService],
})
export class SystemMonitoringModule {}
