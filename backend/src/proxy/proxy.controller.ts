import { Controller, Get, Post, Delete, Param, Body, Request } from '@nestjs/common';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { PayloadToken } from 'src/auth/models/token.model';
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { ProxyService } from './proxy.service';
import { ProxyRouterService } from './proxy-router.service';

@Controller('proxy')
export class ProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly instanceSettings: InstanceSettingsService,
    private readonly proxyRouter: ProxyRouterService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private async assertServerAccess(req, serverId: string) {
    const user = await this.usersService.getRequiredUserById((req.user as PayloadToken).userId);
    this.accessControlService.assertServerAccess(user, serverId);
  }

  @Get('status')
  async getStatus() {
    const [routes, settings, router, running] = await Promise.all([
      this.proxyService.getRoutesStatus(),
      this.proxyService.getProxySettings(),
      this.instanceSettings.getRouterSettings(),
      this.proxyRouter.isRunning(),
    ]);

    return {
      available: !!settings.baseDomain,
      enabled: settings.enabled && !!settings.baseDomain,
      baseDomain: settings.baseDomain,
      // The host port mc-router publishes: what players actually connect to.
      proxyPort: router.proxyPort,
      autoScaleAvailable: router.autoScaleEnabled,
      // Whether the container is actually up, not whether a routes file exists.
      running,
      ...routes,
    };
  }

  // Only the caller's own servers: the full table would list every server id and hostname.
  @Get('mappings')
  async getMappings(@Request() req) {
    const user = await this.usersService.getRequiredUserById((req.user as PayloadToken).userId);
    const mappings = await this.proxyService.getAllMappings();
    const serverId = (mapping: { backend: string }) => mapping.backend.split(':')[0];
    const visible = new Set(this.accessControlService.getVisibleServerIds(user, mappings.map(serverId)));
    return mappings.filter((mapping) => visible.has(serverId(mapping)));
  }

  @Get('server/:id/hostname')
  async getServerHostname(@Request() req, @Param('id') serverId: string) {
    await this.assertServerAccess(req, serverId);
    const hostname = await this.proxyService.getServerHostname(serverId);
    return { hostname };
  }

  @Post('server/:id')
  async addServer(@Request() req, @Param('id') serverId: string, @Body() body: { hostname?: string }) {
    await this.assertServerAccess(req, serverId);
    // The base domain is instance-wide; taking it from the body let a caller route any name.
    const { baseDomain } = await this.proxyService.getProxySettings();
    await this.proxyService.addServerToProxy(serverId, baseDomain, body.hostname);
    return { success: true };
  }

  @Delete('server/:id')
  async removeServer(@Request() req, @Param('id') serverId: string) {
    await this.assertServerAccess(req, serverId);
    await this.proxyService.removeServerFromProxy(serverId);
    return { success: true };
  }
}
