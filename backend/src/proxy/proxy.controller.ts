import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { ProxyService } from './proxy.service';

@Controller('proxy')
export class ProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly instanceSettings: InstanceSettingsService,
  ) {}

  @Get('status')
  async getStatus() {
    const [proxyStatus, settings, router] = await Promise.all([
      this.proxyService.getProxyStatus(),
      this.proxyService.getProxySettings(),
      this.instanceSettings.getRouterSettings(),
    ]);

    return {
      available: !!settings.baseDomain,
      enabled: settings.enabled && !!settings.baseDomain,
      baseDomain: settings.baseDomain,
      autoScaleAvailable: router.autoScaleEnabled,
      ...proxyStatus,
    };
  }

  @Get('mappings')
  async getMappings() {
    return this.proxyService.getAllMappings();
  }

  @Get('server/:id/hostname')
  async getServerHostname(@Param('id') serverId: string) {
    const hostname = await this.proxyService.getServerHostname(serverId);
    return { hostname };
  }

  @Post('server/:id')
  async addServer(@Param('id') serverId: string, @Body() body: { hostname?: string; baseDomain: string }) {
    await this.proxyService.addServerToProxy(serverId, body.baseDomain, body.hostname);
    return { success: true };
  }

  @Delete('server/:id')
  async removeServer(@Param('id') serverId: string) {
    await this.proxyService.removeServerFromProxy(serverId);
    return { success: true };
  }
}
