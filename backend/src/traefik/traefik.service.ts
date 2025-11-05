import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as path from 'node:path';

export interface TraefikTcpRouter {
  rule: string;
  service: string;
  entryPoints: string[];
  tls?: {
    certResolver?: string;
    domains?: Array<{ main: string; sans?: string[] }>;
  };
}

export interface TraefikTcpService {
  loadBalancer: {
    servers: Array<{ address: string }>;
  };
}

export interface TraefikDynamicConfig {
  tcp?: {
    routers?: Record<string, TraefikTcpRouter>;
    services?: Record<string, TraefikTcpService>;
  };
}

export interface MinecraftServerTraefikConfig {
  serverId: string;
  domain: string;
  port: number;
  entrypoint?: string;
}

@Injectable()
export class TraefikService {
  private readonly logger = new Logger(TraefikService.name);
  private readonly TRAEFIK_CONFIG_DIR = process.env.TRAEFIK_DYNAMIC_CONFIG_DIR || path.join(process.cwd(), '..', 'traefik', 'dynamic');
  private readonly SERVERS_CONFIG_FILE = path.join(this.TRAEFIK_CONFIG_DIR, 'minecraft-servers.yml');

  constructor() {
    this.ensureConfigDirectoryExists();
  }

  private async ensureConfigDirectoryExists(): Promise<void> {
    try {
      await fs.ensureDir(this.TRAEFIK_CONFIG_DIR);
      this.logger.log(`Traefik dynamic config directory ensured at: ${this.TRAEFIK_CONFIG_DIR}`);
    } catch (error) {
      this.logger.error('Failed to create Traefik config directory', error);
    }
  }

  async generateServerConfig(config: MinecraftServerTraefikConfig): Promise<void> {
    try {
      const currentConfig = await this.loadCurrentConfig();
      const routerName = config.serverId;
      const serviceName = `${config.serverId}-svc`;

      if (!currentConfig.tcp) {
        currentConfig.tcp = {};
      }
      if (!currentConfig.tcp.routers) {
        currentConfig.tcp.routers = {};
      }
      if (!currentConfig.tcp.services) {
        currentConfig.tcp.services = {};
      }

      currentConfig.tcp.routers[routerName] = {
        rule: `HostSNI(\`${config.domain}\`)`,
        service: serviceName,
        entryPoints: [config.entrypoint || 'minecraft'],
      };

      currentConfig.tcp.services[serviceName] = {
        loadBalancer: {
          servers: [
            {
              address: `${config.serverId}:25565`,
            },
          ],
        },
      };

      await this.saveConfig(currentConfig);
      this.logger.log(`Traefik config updated for server: ${config.serverId}`);
    } catch (error) {
      this.logger.error(`Failed to generate Traefik config for ${config.serverId}`, error);
      throw error;
    }
  }

  async removeServerConfig(serverId: string): Promise<void> {
    try {
      const currentConfig = await this.loadCurrentConfig();

      if (currentConfig.tcp?.routers) {
        delete currentConfig.tcp.routers[serverId];
      }

      if (currentConfig.tcp?.services) {
        delete currentConfig.tcp.services[`${serverId}-svc`];
      }

      await this.saveConfig(currentConfig);
      this.logger.log(`Traefik config removed for server: ${serverId}`);
    } catch (error) {
      this.logger.error(`Failed to remove Traefik config for ${serverId}`, error);
      throw error;
    }
  }

  async updateServerConfig(config: MinecraftServerTraefikConfig): Promise<void> {
    await this.generateServerConfig(config);
  }

  async getCurrentConfig(): Promise<TraefikDynamicConfig> {
    return this.loadCurrentConfig();
  }

  async isDomainInUse(domain: string, excludeServerId?: string): Promise<boolean> {
    try {
      const config = await this.loadCurrentConfig();

      if (!config.tcp?.routers) {
        return false;
      }

      for (const [routerId, router] of Object.entries(config.tcp.routers)) {
        if (excludeServerId && routerId === excludeServerId) {
          continue;
        }

        const domainMatch = router.rule.match(/HostSNI\(`([^`]+)`\)/);
        if (domainMatch && domainMatch[1] === domain) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check domain usage', error);
      return false;
    }
  }

  async getConfiguredServers(): Promise<string[]> {
    try {
      const config = await this.loadCurrentConfig();

      if (!config.tcp?.routers) {
        return [];
      }

      return Object.keys(config.tcp.routers);
    } catch (error) {
      this.logger.error('Failed to get configured servers', error);
      return [];
    }
  }

  private async loadCurrentConfig(): Promise<TraefikDynamicConfig> {
    try {
      if (await fs.pathExists(this.SERVERS_CONFIG_FILE)) {
        const content = await fs.readFile(this.SERVERS_CONFIG_FILE, 'utf8');
        return yaml.load(content) as TraefikDynamicConfig;
      }
    } catch (error) {
      this.logger.warn('Failed to load existing config, returning empty config', error);
    }

    return { tcp: { routers: {}, services: {} } };
  }

  private async saveConfig(config: TraefikDynamicConfig): Promise<void> {
    try {
      await this.ensureConfigDirectoryExists();
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
      });
      await fs.writeFile(this.SERVERS_CONFIG_FILE, yamlContent, 'utf8');
      this.logger.log('Traefik configuration saved successfully');
    } catch (error) {
      this.logger.error('Failed to save Traefik configuration', error);
      throw error;
    }
  }

  getEntrypointForPort(port: number): string {
    if (port === 25565) {
      return 'minecraft';
    }
    return `minecraft-${port}`;
  }

  async isTraefikAvailable(): Promise<boolean> {
    try {
      const { exec } = require('node:child_process');
      const { promisify } = require('node:util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('docker ps --filter "name=minepanel-traefik" --format "{{.Names}}"');
      return stdout.trim() === 'minepanel-traefik';
    } catch (error) {
      this.logger.warn('Failed to check Traefik availability', error);
      return false;
    }
  }
}
