import { Module, forwardRef } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyRouterService } from './proxy-router.service';
import { HostContextService } from 'src/common/docker/host-context.service';
import { ProxyController } from './proxy.controller';
import { SettingsModule } from 'src/settings/settings.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  // UsersModule imports ProxyModule for the proxy power endpoint, hence the forwardRef.
  imports: [SettingsModule, forwardRef(() => UsersModule)],
  controllers: [ProxyController],
  providers: [ProxyService, ProxyRouterService, HostContextService],
  exports: [ProxyService, ProxyRouterService, HostContextService],
})
export class ProxyModule {}
