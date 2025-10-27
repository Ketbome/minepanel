import { Module } from '@nestjs/common';
import { SystemMonitoringController } from './system-monitoring.controller';
import { SystemMonitoringService } from './system-monitoring.service';

@Module({
  controllers: [SystemMonitoringController],
  providers: [SystemMonitoringService],
  exports: [SystemMonitoringService],
})
export class SystemMonitoringModule {}
