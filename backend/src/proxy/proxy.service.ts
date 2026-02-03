import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { Settings } from 'src/users/entities/settings.entity';

export interface ProxyMapping {
  host: string;
  backend: string;
}

interface ProxyRoutesConfig {
  mappings: ProxyMapping[];
}

interface ServerProxyInfo {
  id: string;
  hostname?: string;
  useProxy: boolean;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly PROXY_DIR: string;
  private readonly ROUTES_FILE: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {
    const baseDir = this.configService.get<string>('baseDir') || '/app';
    this.PROXY_DIR = path.join(baseDir, 'data', 'proxy');
    this.ROUTES_FILE = path.join(this.PROXY_DIR, 'routes.json');
  }

  async getProxySettings(userId?: number): Promise<{ enabled: boolean; baseDomain: string | null }> {
    let settings;
    if (userId) {
      settings = await this.settingsRepo.findOne({ where: { userId } });
    } else {
      const [first] = await this.settingsRepo.find({ order: { id: 'ASC' }, take: 1 });
      settings = first;
    }
    return {
      enabled: settings?.preferences?.proxyEnabled ?? false,
      baseDomain: settings?.preferences?.proxyBaseDomain ?? null,
    };
  }

  async isProxyAvailable(userId?: number): Promise<boolean> {
    const { baseDomain } = await this.getProxySettings(userId);
    return !!baseDomain;
  }

  async isProxyEnabled(userId?: number): Promise<boolean> {
    const { enabled, baseDomain } = await this.getProxySettings(userId);
    return enabled && !!baseDomain;
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

    const mappings: ProxyMapping[] = servers
      .filter((s) => s.useProxy)
      .map((server) => ({
        host: this.generateHostname(server.id, baseDomain, server.hostname),
        backend: `${server.id}:25565`,
      }));

    const config: ProxyRoutesConfig = { mappings };

    await fs.writeJson(this.ROUTES_FILE, config, { spaces: 2 });
    this.logger.log(`Generated routes.json with ${mappings.length} mappings`);
  }

  async addServerToProxy(serverId: string, baseDomain: string, customHostname?: string): Promise<void> {
    const config = await this.loadRoutesConfig();
    const hostname = this.generateHostname(serverId, baseDomain, customHostname);

    // Evitar duplicados
    const existing = config.mappings.findIndex((m) => m.backend === `${serverId}:25565`);
    if (existing >= 0) {
      config.mappings[existing].host = hostname;
    } else {
      config.mappings.push({ host: hostname, backend: `${serverId}:25565` });
    }

    await this.saveRoutesConfig(config);
    this.logger.log(`Added/updated server ${serverId} to proxy with hostname ${hostname}`);
  }

  async removeServerFromProxy(serverId: string): Promise<void> {
    const config = await this.loadRoutesConfig();
    config.mappings = config.mappings.filter((m) => m.backend !== `${serverId}:25565`);

    await this.saveRoutesConfig(config);
    this.logger.log(`Removed server ${serverId} from proxy`);
  }

  async getServerHostname(serverId: string): Promise<string | null> {
    const config = await this.loadRoutesConfig();
    const mapping = config.mappings.find((m) => m.backend === `${serverId}:25565`);
    if (mapping) {
      return mapping.host;
    }

    const proxySettings = await this.getProxySettings();
    if (proxySettings.enabled && proxySettings.baseDomain) {
      return this.generateHostname(serverId, proxySettings.baseDomain);
    }

    return null;
  }

  async getAllMappings(): Promise<ProxyMapping[]> {
    const config = await this.loadRoutesConfig();
    return config.mappings;
  }

  private async loadRoutesConfig(): Promise<ProxyRoutesConfig> {
    try {
      if (await fs.pathExists(this.ROUTES_FILE)) {
        return await fs.readJson(this.ROUTES_FILE);
      }
    } catch (error) {
      this.logger.warn('Error loading routes.json, creating new one');
      this.logger.error(error);
    }
    return { mappings: [] };
  }

  private async saveRoutesConfig(config: ProxyRoutesConfig): Promise<void> {
    await fs.ensureDir(this.PROXY_DIR);
    await fs.writeJson(this.ROUTES_FILE, config, { spaces: 2 });
  }

  async getProxyStatus(): Promise<{ running: boolean; routesCount: number }> {
    const config = await this.loadRoutesConfig();
    // mc-router se considera running si el archivo routes.json existe y tiene mappings
    const routesExist = await fs.pathExists(this.ROUTES_FILE);
    return {
      running: routesExist,
      routesCount: config.mappings.length,
    };
  }
}
