import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TraefikService, TraefikDynamicConfig } from 'src/traefik/traefik.service';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';

@Controller('traefik')
@UseGuards(JwtAuthGuard)
export class TraefikController {
  constructor(private readonly traefikService: TraefikService) {}

  @Get('status')
  async getTraefikStatus() {
    const isAvailable = await this.traefikService.isTraefikAvailable();
    return {
      available: isAvailable,
      message: isAvailable ? 'Traefik is running' : 'Traefik is not running',
    };
  }

  @Get('config')
  async getTraefikConfig(): Promise<TraefikDynamicConfig> {
    const config = await this.traefikService.getCurrentConfig();
    return config;
  }

  @Get('servers')
  async getTraefikConfiguredServers() {
    const servers = await this.traefikService.getConfiguredServers();
    return { servers };
  }

  @Post(':id/validate-domain')
  async validateDomain(@Param('id') id: string, @Body() body: { domain: string }) {
    const inUse = await this.traefikService.isDomainInUse(body.domain, id);
    return {
      available: !inUse,
      domain: body.domain,
      message: inUse ? 'Domain is already in use' : 'Domain is available',
    };
  }
}
