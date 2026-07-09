import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServerManagementModule } from './server-management/server-management.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import config from 'src/config';
import { DatabaseModule } from './database/database.module';
import { SystemMonitoringModule } from './system-monitoring/system-monitoring.module';
import { DiscordModule } from './discord/discord.module';
import { CurseforgeModule } from './curseforge/curseforge.module';
import { FilesModule } from './files/files.module';
import { ProxyModule } from './proxy/proxy.module';
import { ModrinthModule } from './modrinth/modrinth.module';
import { WorldDiscoveryModule } from './world-discovery/world-discovery.module';
import { BedrockAddonsModule } from './bedrock-addons/bedrock-addons.module';
import { MetricsModule } from './metrics/metrics.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { AlertsModule } from './alerts/alerts.module';
import { JwtAuthGuard } from './auth/guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{ ttl: seconds(60), limit: 10 }]),
    DatabaseModule,
    UsersModule,
    ServerManagementModule,
    AuthModule,
    SystemMonitoringModule,
    DiscordModule,
    CurseforgeModule,
    ModrinthModule,
    WorldDiscoveryModule,
    BedrockAddonsModule,
    MetricsModule,
    ScheduledTasksModule,
    AlertsModule,
    FilesModule,
    ProxyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
