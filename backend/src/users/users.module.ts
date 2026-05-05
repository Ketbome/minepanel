import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { SettingsController } from './controllers/settings.controller';
import { Settings } from './entities/settings.entity';
import { SettingsService } from './services/settings.service';
import { DiscordModule } from 'src/discord/discord.module';
import { UserInvitation } from './entities/user-invitation.entity';
import { AccessControlService } from './services/access-control.service';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Settings, UserInvitation]), DiscordModule],
  controllers: [UsersController, SettingsController],
  providers: [UsersService, SettingsService, AccessControlService],
  exports: [UsersService, SettingsService, AccessControlService],
})
export class UsersModule {}
