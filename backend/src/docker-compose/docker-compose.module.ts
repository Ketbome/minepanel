import { Module } from '@nestjs/common';
import { DockerComposeService } from './docker-compose.service';
import { ServerStoreService } from './server-store.service';
import { SettingsModule } from 'src/settings/settings.module';

/**
 * Three modules used to list these as their own providers, which gave each of
 * them a separate instance: the startup migration ran three times and three
 * copies raced to write the server index. Providing them here once means every
 * consumer shares one.
 */
@Module({
  imports: [SettingsModule],
  providers: [DockerComposeService, ServerStoreService],
  exports: [DockerComposeService, ServerStoreService],
})
export class DockerComposeModule {}
