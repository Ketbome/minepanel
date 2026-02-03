import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller('proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('status')
  async getStatus() {
    const [proxyStatus, settings] = await Promise.all([this.proxyService.getProxyStatus(), this.proxyService.getProxySettings()]);

    return {
      available: !!settings.baseDomain,
      enabled: settings.enabled && !!settings.baseDomain,
      baseDomain: settings.baseDomain,
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
