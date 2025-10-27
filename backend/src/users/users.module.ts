import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Users } from './entities/users.entity';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import config from 'src/config';
import { SettingsController } from './controllers/settings.controller';
import { Settings } from './entities/settings.entity';
import { SettingsService } from './services/settings.service';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Settings]), ConfigModule.forFeature(config), DiscordModule],
  controllers: [UsersController, SettingsController],
  providers: [UsersService, SettingsService],
  exports: [UsersService, SettingsService],
})
export class UsersModule {}
