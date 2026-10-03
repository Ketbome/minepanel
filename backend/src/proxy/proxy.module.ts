import { Module, forwardRef } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyRouterService } from './proxy-router.service';
import { VelocityRuntimeService } from './velocity-runtime.service';
import { VelocityForwardingService } from './velocity-forwarding.service';
import { HostContextService } from 'src/common/docker/host-context.service';
import { ProxyController } from './proxy.controller';
import { SettingsModule } from 'src/settings/settings.module';
import { UsersModule } from 'src/users/users.module';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';

@Module({
  // UsersModule imports ProxyModule for the proxy power endpoint, hence the forwardRef.
  imports: [SettingsModule, DockerComposeModule, forwardRef(() => UsersModule)],
  controllers: [ProxyController],
  providers: [ProxyService, ProxyRouterService, VelocityRuntimeService, VelocityForwardingService, HostContextService],
  exports: [ProxyService, ProxyRouterService, VelocityRuntimeService, VelocityForwardingService, HostContextService],
})
export class ProxyModule {}
