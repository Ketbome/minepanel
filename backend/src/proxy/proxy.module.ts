import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyRouterService } from './proxy-router.service';
import { HostContextService } from 'src/common/docker/host-context.service';
import { ProxyController } from './proxy.controller';
import { SettingsModule } from 'src/settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [ProxyController],
  providers: [ProxyService, ProxyRouterService, HostContextService],
  exports: [ProxyService, ProxyRouterService, HostContextService],
})
export class ProxyModule {}
