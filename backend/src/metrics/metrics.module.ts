import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricSample } from './entities/metric-sample.entity';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ServerManagementModule } from 'src/server-management/server-management.module';
import { UsersModule } from 'src/users/users.module';
import { AlertsModule } from 'src/alerts/alerts.module';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [TypeOrmModule.forFeature([MetricSample]), ServerManagementModule, UsersModule, AlertsModule, DockerComposeModule],
  controllers: [MetricsController],
  providers: [MetricsService, MonitoringService],
})
export class MetricsModule {}
