import { Body, Controller, Headers, HttpCode, Logger, NotFoundException, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { connect } from 'node:net';
import { Public } from 'src/auth/decorators/public.decorator';
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
    private readonly configService: ConfigService,
    private readonly managementService: ServerManagementService,
    private readonly proxyService: ProxyService,
  ) {}

  @Public()
  @Post('autoscale')
  @HttpCode(200)
  async autoScale(@Headers('authorization') authorization: string, @Body() body: AutoScaleDto) {
    this.assertAuthorized(authorization);

    const { serverId, port } = await this.resolveBackend(body);

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

  private assertAuthorized(authorization?: string): void {
    const token = this.configService.get<string>('autoScaleToken');
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
