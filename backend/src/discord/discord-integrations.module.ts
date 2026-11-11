import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { DiscordIntegrationsController } from './discord-integrations.controller';
import { DiscordModule } from './discord.module';

// Separate from DiscordModule because UsersModule already imports DiscordModule;
// putting the controller there would close the cycle.
@Module({
  imports: [DiscordModule, UsersModule],
  controllers: [DiscordIntegrationsController],
})
export class DiscordIntegrationsModule {}
