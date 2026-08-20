import { Body, Controller, Headers, HttpCode, Logger, NotFoundException, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { timingSafeEqual } from 'node:crypto';
import { connect } from 'node:net';
import { Public } from 'src/auth/decorators/public.decorator';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { ProxyService } from 'src/proxy/proxy.service';
import { ServerManagementService } from './server-management.service';
import { AutoScaleDto } from './dto/auto-scale.dto';

const WAKE_TIMEOUT_MS = 150_000;
const WAKE_POLL_INTERVAL_MS = 2_000;

// mc-router auto-scaling for static routes: the router asks the panel to wake a
// server on the first connection and to put it back to sleep once idle.
@Controller('servers')
export class AutoScaleController {
  private readonly logger = new Logger(AutoScaleController.name);

  constructor(
    private readonly instanceSettings: InstanceSettingsService,
    private readonly managementService: ServerManagementService,
    private readonly proxyService: ProxyService,
    private readonly composeService: DockerComposeService,
  ) {}

  @Public()
  @Post('autoscale')
  @HttpCode(200)
  async autoScale(@Headers('authorization') authorization: string, @Body() body: AutoScaleDto) {
    await this.assertAuthorized(authorization);

    const { serverId, port } = await this.resolveBackend(body);

    // Servers can opt out individually: the router scales every route it knows
    // about, so the panel is the only place that can leave one alone.
    const config = await this.composeService.getServerConfig(serverId);
    if (config?.useAutoScale === false) {
      this.logger.log(`Auto-scale ${body.action}: ${serverId} has auto-scaling disabled`);
      // A rejected scale-down is retried on every idle cycle, so answer 200 and
      // keep the router quiet. A scale-up must fail so the connection aborts now
      // instead of waiting out the wake timeout for a server we will not start.
      if (body.action === 'down') {
        return { serverId, status: 'skipped' };
      }
      throw new ServiceUnavailableException(`Auto-scaling is disabled for server ${serverId}`);
    }

    if (body.action === 'down') {
      this.logger.log(`Auto-scale down: stopping ${serverId}`);
      if (!(await this.managementService.stopServer(serverId))) {
        throw new ServiceUnavailableException(`Failed to stop server ${serverId}`);
      }
      return { serverId, status: 'stopped' };
    }

    if ((await this.managementService.getServerStatus(serverId)) === 'running') {
      return { serverId, status: 'running' };
    }

    this.logger.log(`Auto-scale up: starting ${serverId} for ${body.serverAddress || 'default route'}`);
    if (!(await this.managementService.startServer(serverId))) {
      throw new ServiceUnavailableException(`Failed to start server ${serverId}`);
    }

    if (!(await this.waitForPort(serverId, port))) {
      throw new ServiceUnavailableException(`Server ${serverId} is still starting`);
    }

    return { serverId, status: 'running' };
  }

  private async assertAuthorized(authorization?: string): Promise<void> {
    // The panel mints this when auto-scaling is switched on, so the endpoint
    // simply does not exist until then.
    const token = await this.instanceSettings.getAutoScaleToken();
    if (!token) {
      throw new NotFoundException();
    }

    const provided = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const expected = Buffer.from(token);
    const received = Buffer.from(provided);

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new UnauthorizedException();
    }
  }

  // Only servers currently present in routes.json can be scaled, so a leaked
  // token cannot drive arbitrary servers.
  private async resolveBackend(body: AutoScaleDto): Promise<{ serverId: string; port: number }> {
    const mappings = await this.proxyService.getAllMappings();
    const mapping = body.backend
      ? mappings.find((m) => m.backend === body.backend)
      : mappings.find((m) => m.host === body.serverAddress);

    if (!mapping) {
      throw new NotFoundException(`No proxy route matches ${body.backend || body.serverAddress}`);
    }

    const [serverId, port] = mapping.backend.split(':');
    return { serverId, port: Number(port) || 25565 };
  }

  private async waitForPort(serverId: string, port: number): Promise<boolean> {
    const deadline = Date.now() + WAKE_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (await this.isPortOpen(serverId, port)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, WAKE_POLL_INTERVAL_MS));
    }

    return false;
  }

  private isPortOpen(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = connect({ host, port, timeout: WAKE_POLL_INTERVAL_MS });
      const finish = (open: boolean) => {
        socket.destroy();
        resolve(open);
      };
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
    });
  }
}
