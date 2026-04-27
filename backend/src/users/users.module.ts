import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { SettingsController } from './controllers/settings.controller';
import { Settings } from './entities/settings.entity';
import { SettingsService } from './services/settings.service';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Settings]), DiscordModule],
  controllers: [UsersController, SettingsController],
  providers: [UsersService, SettingsService],
  exports: [UsersService, SettingsService],
})
export class UsersModule {}
