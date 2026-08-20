import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { getComposeLabel, getComposeLabelFlag } from 'src/common/compose/compose-labels';

export interface ProxyMapping {
  host: string;
  backend: string;
}

// mc-router routes config format: { "mappings": { "hostname": "backend:port" } }
interface ProxyRoutesConfig {
  'default-server'?: string;
  mappings: Record<string, string>;
}

interface ServerProxyInfo {
  id: string;
  hostname?: string;
  useProxy: boolean;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly SERVERS_DIR: string;
  private readonly PROXY_DIR: string;
  private readonly ROUTES_FILE: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly instanceSettings: InstanceSettingsService,
  ) {
    this.SERVERS_DIR = this.configService.get('serversDir');
    // Use /app/data for files written by backend (not BASE_DIR which is for host paths)
    this.PROXY_DIR = '/app/data/proxy';
    this.ROUTES_FILE = path.join(this.PROXY_DIR, 'routes.json');
  }

  // Proxy routing is instance-wide: it decides how every server's compose file is
  // generated, so it no longer depends on which user is asking.
  async getProxySettings(): Promise<{ enabled: boolean; baseDomain: string | null }> {
    return this.instanceSettings.getProxy();
  }

  async isProxyAvailable(): Promise<boolean> {
    const { baseDomain } = await this.getProxySettings();
    return !!baseDomain;
  }

  async isProxyEnabled(): Promise<boolean> {
    const { enabled } = await this.getProxySettings();
    return enabled;
  }

  generateHostname(serverId: string, baseDomain: string, customHostname?: string): string {
    if (customHostname) {
      // Si el hostname custom ya incluye el dominio base, usarlo tal cual
      if (customHostname.includes('.')) {
        return customHostname;
      }
      // Si no, agregarlo como subdominio
      return `${customHostname}.${baseDomain}`;
    }
    return `${serverId}.${baseDomain}`;
  }

  async generateRoutesFile(servers: ServerProxyInfo[], baseDomain: string): Promise<void> {
    await fs.ensureDir(this.PROXY_DIR);

    const mappings: Record<string, string> = {};
    servers
      .filter((s) => s.useProxy)
      .forEach((server) => {
        const hostname = this.generateHostname(server.id, baseDomain, server.hostname);
        mappings[hostname] = `${server.id}:25565`;
      });

    const config: ProxyRoutesConfig = { mappings };

    await fs.writeJson(this.ROUTES_FILE, config, { spaces: 2 });
    this.logger.log(`Generated routes.json with ${Object.keys(mappings).length} mappings`);
  }

  async addServerToProxy(serverId: string, baseDomain: string, customHostname?: string): Promise<void> {
    const config = await this.loadRoutesConfig();
    const hostname = this.generateHostname(serverId, baseDomain, customHostname);

    // Remove old mapping for this server if exists (different hostname)
    for (const [host, backend] of Object.entries(config.mappings)) {
      if (backend === `${serverId}:25565` && host !== hostname) {
        delete config.mappings[host];
      }
    }

    config.mappings[hostname] = `${serverId}:25565`;

    await this.saveRoutesConfig(config);
    this.logger.log(`Added/updated server ${serverId} to proxy with hostname ${hostname}`);
  }

  async removeServerFromProxy(serverId: string): Promise<void> {
    const config = await this.loadRoutesConfig();
    const backend = `${serverId}:25565`;

    for (const [host, b] of Object.entries(config.mappings)) {
      if (b === backend) {
        delete config.mappings[host];
      }
    }

    await this.saveRoutesConfig(config);
    this.logger.log(`Removed server ${serverId} from proxy`);
  }

  async clearRoutesFile(): Promise<void> {
    await this.saveRoutesConfig({ mappings: {} });
    this.logger.log('Cleared proxy routes.json');
  }

  async getServerHostname(serverId: string): Promise<string | null> {
    const config = await this.loadRoutesConfig();
    const backend = `${serverId}:25565`;

    // Find hostname by backend
    for (const [host, b] of Object.entries(config.mappings)) {
      if (b === backend) {
        return host;
      }
    }

    const proxySettings = await this.getProxySettings();
    if (proxySettings.enabled && proxySettings.baseDomain) {
      return this.getConfiguredServerHostname(serverId, proxySettings.baseDomain);
    }

    return null;
  }

  private async getConfiguredServerHostname(serverId: string, baseDomain: string): Promise<string | null> {
    try {
      const dockerComposePath = path.join(this.SERVERS_DIR, serverId, 'docker-compose.yml');
      if (!(await fs.pathExists(dockerComposePath))) {
        return this.generateHostname(serverId, baseDomain);
      }

      const content = await fs.readFile(dockerComposePath, 'utf8');
      const compose = yaml.load(content) as { services?: { mc?: { labels?: string[] | Record<string, string | boolean> } } };
      const labels = compose?.services?.mc?.labels;

      if (!getComposeLabelFlag(labels, 'minepanel.proxy.enabled', true)) {
        return null;
      }

      return this.generateHostname(serverId, baseDomain, getComposeLabel(labels, 'minepanel.proxy.hostname'));
    } catch (error) {
      this.logger.warn(`Failed to load configured proxy hostname for ${serverId}`, error);
      return this.generateHostname(serverId, baseDomain);
    }
  }

  async getAllMappings(): Promise<ProxyMapping[]> {
    const config = await this.loadRoutesConfig();
    return Object.entries(config.mappings).map(([host, backend]) => ({ host, backend }));
  }

  private async loadRoutesConfig(): Promise<ProxyRoutesConfig> {
    try {
      if (await fs.pathExists(this.ROUTES_FILE)) {
        const data = await fs.readJson(this.ROUTES_FILE);
        // Handle migration from old array format
        if (Array.isArray(data.mappings)) {
          const mappings: Record<string, string> = {};
          for (const m of data.mappings) {
            mappings[m.host] = m.backend;
          }
          return { mappings };
        }
        return data;
      }
    } catch (error) {
      this.logger.warn('Error loading routes.json, creating new one');
      this.logger.error(error);
    }
    return { mappings: {} };
  }

  private async saveRoutesConfig(config: ProxyRoutesConfig): Promise<void> {
    await fs.ensureDir(this.PROXY_DIR);
    await fs.writeJson(this.ROUTES_FILE, config, { spaces: 2 });
  }

  // Deliberately not called "running": the presence of a routes file says nothing
  // about whether the router container is up. Ask ProxyRouterService for that.
  async getRoutesStatus(): Promise<{ hasRoutesFile: boolean; routesCount: number }> {
    const config = await this.loadRoutesConfig();
    return {
      hasRoutesFile: await fs.pathExists(this.ROUTES_FILE),
      routesCount: Object.keys(config.mappings).length,
    };
  }
}
