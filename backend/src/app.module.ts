import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServerManagementModule } from './server-management/server-management.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import config from 'src/config';
import { DatabaseModule } from './database/database.module';
import { SystemMonitoringModule } from './system-monitoring/system-monitoring.module';
import { DiscordModule } from './discord/discord.module';
import { CurseforgeModule } from './curseforge/curseforge.module';
import { FilesModule } from './files/files.module';
import { SharedModule } from './shared/shared.module';
import { HytaleServersModule } from './hytale-servers/hytale-servers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
    DatabaseModule,
    SharedModule,
    UsersModule,
    ServerManagementModule,
    HytaleServersModule,
    AuthModule,
    SystemMonitoringModule,
    DiscordModule,
    CurseforgeModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
