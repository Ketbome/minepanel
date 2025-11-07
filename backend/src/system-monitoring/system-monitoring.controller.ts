import { Controller, Get, UseGuards } from '@nestjs/common';
import { SystemMonitoringService } from './system-monitoring.service';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';

@Controller('system')
@UseGuards(JwtAuthGuard)
export class SystemMonitoringController {
  constructor(private readonly systemMonitoringService: SystemMonitoringService) {}

  @Get('stats')
  async getSystemStats() {
    return this.systemMonitoringService.getSystemStats();
  }

  @Get('network')
  getNetworkInfo() {
    return this.systemMonitoringService.getNetworkInfo();
  }
}
