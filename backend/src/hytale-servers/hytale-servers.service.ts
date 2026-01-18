import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { DockerComposeFactory, HytaleServerConfig } from '../shared/factories/docker-compose.factory';
import { AttachConsoleStrategy } from '../shared/strategies/attach-console.strategy';
import {
  HytaleConfig,
  HytaleServerListItem,
  UpdateHytaleConfigDto,
  CreateHytaleServerDto,
} from './dto/hytale-config.model';

const execAsync = promisify(exec);

export type HytaleServerStatus = 'running' | 'stopped' | 'starting' | 'not_found';

export interface HytaleServerInfo {
  exists: boolean;
  status: HytaleServerStatus;
  dockerComposeExists?: boolean;
  serverDataExists?: boolean;
  error?: string;
}

export interface HytaleLogsResponse {
  logs: string;
  hasErrors: boolean;
  lastUpdate: Date;
  status: HytaleServerStatus;
}

@Injectable()
export class HytaleServersService {
  private readonly logger = new Logger(HytaleServersService.name);
  private readonly SERVERS_DIR: string;
  private readonly BASE_DIR: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly composeFactory: DockerComposeFactory,
    private readonly attachStrategy: AttachConsoleStrategy,
  ) {
    this.SERVERS_DIR = this.configService.get('serversDir');
    this.BASE_DIR = this.configService.get('baseDir');
    fs.ensureDirSync(this.SERVERS_DIR);
  }

  private validateServerId(serverId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(serverId);
  }

  private getServerPath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId);
  }

  private getDockerComposePath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'docker-compose.yml');
  }

  private getServerDataPath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'server');
  }

  /**
   * Get all Hytale server IDs
   */
  async getAllServerIds(): Promise<string[]> {
    try {
      if (!(await fs.pathExists(this.SERVERS_DIR))) {
        return [];
      }

      const entries = await fs.readdir(this.SERVERS_DIR, { withFileTypes: true });
      const serverIds: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const composePath = this.getDockerComposePath(entry.name);
        if (!(await fs.pathExists(composePath))) continue;

        // Check if it's a Hytale server by checking the compose content
        try {
          const content = await fs.readFile(composePath, 'utf8');
          const compose = yaml.load(content) as any;
          if (compose?.services?.hytale) {
            serverIds.push(entry.name);
          }
        } catch {
          // Skip if can't read compose
        }
      }

      return serverIds;
    } catch (error) {
      this.logger.error('Failed to get Hytale server IDs', error);
      return [];
    }
  }

  /**
   * Get all Hytale servers (list view)
   */
  async getAllServers(): Promise<HytaleServerListItem[]> {
    const serverIds = await this.getAllServerIds();
    const servers: HytaleServerListItem[] = [];

    for (const id of serverIds) {
      const config = await this.getServerConfig(id);
      if (config) {
        servers.push({
          id: config.id,
          serverName: config.serverName,
          port: config.port,
          active: config.active,
        });
      }
    }

    return servers;
  }

  /**
   * Get server configuration from docker-compose.yml
   */
  async getServerConfig(serverId: string): Promise<HytaleConfig | null> {
    if (!this.validateServerId(serverId)) {
      return null;
    }

    const composePath = this.getDockerComposePath(serverId);
    if (!(await fs.pathExists(composePath))) {
      return null;
    }

    try {
      const content = await fs.readFile(composePath, 'utf8');
      const compose = yaml.load(content) as any;
      const hytaleService = compose?.services?.hytale;

      if (!hytaleService) {
        return null;
      }

      const env = hytaleService.environment || {};
      const serverDataExists = await fs.pathExists(this.getServerDataPath(serverId));

      return {
        id: serverId,
        active: serverDataExists,
        serverName: env.SERVER_NAME || serverId,
        port: env.BIND_PORT || '5520',
        javaXms: env.JAVA_XMS || '4G',
        javaXmx: env.JAVA_XMX || '8G',
        useG1gc: env.USE_G1GC !== 'false',
        viewDistance: env.VIEW_DISTANCE,
        maxPlayers: env.MAX_PLAYERS,
        serverDescription: env.SERVER_NAME,
        dockerImage: hytaleService.image || 'ketbom/hytale-server:latest',
        restartPolicy: hytaleService.restart || 'unless-stopped',
        tz: env.TZ || 'UTC',
        envVars: this.extractCustomEnvVars(env),
        bindAddr: env.BIND_ADDR || '0.0.0.0',
        autoDownload: env.AUTO_DOWNLOAD !== 'false',
      };
    } catch (error) {
      this.logger.error(`Failed to load config for ${serverId}`, error);
      return null;
    }
  }

  /**
   * Create a new Hytale server
   */
  async createServer(dto: CreateHytaleServerDto): Promise<HytaleConfig> {
    if (!this.validateServerId(dto.id)) {
      throw new BadRequestException('Invalid server ID');
    }

    const serverPath = this.getServerPath(dto.id);
    const composePath = this.getDockerComposePath(dto.id);

    if (await fs.pathExists(composePath)) {
      throw new BadRequestException(`Server "${dto.id}" already exists`);
    }

    // Create directories
    await fs.ensureDir(serverPath);
    await fs.ensureDir(this.getServerDataPath(dto.id));

    // Generate config
    const defaultConfig = this.composeFactory.getDefaultHytaleConfig(dto.id);
    const config: HytaleServerConfig = {
      ...defaultConfig,
      serverName: dto.serverName || dto.id,
      port: dto.port || '5520',
    };

    // Generate and write docker-compose.yml
    const composeContent = this.composeFactory.createHytaleCompose(config);
    await fs.writeFile(composePath, composeContent);

    this.logger.log(`Created Hytale server: ${dto.id}`);

    return this.getServerConfig(dto.id) as Promise<HytaleConfig>;
  }

  /**
   * Update server configuration
   */
  async updateServerConfig(serverId: string, dto: UpdateHytaleConfigDto): Promise<HytaleConfig> {
    const currentConfig = await this.getServerConfig(serverId);
    if (!currentConfig) {
      throw new NotFoundException(`Server "${serverId}" not found`);
    }

    const updatedConfig: HytaleServerConfig = {
      id: serverId,
      serverName: dto.serverName ?? currentConfig.serverName,
      port: dto.port ?? currentConfig.port,
      javaXms: dto.javaXms ?? currentConfig.javaXms,
      javaXmx: dto.javaXmx ?? currentConfig.javaXmx,
      useG1gc: dto.useG1gc ?? currentConfig.useG1gc,
      viewDistance: dto.viewDistance ?? currentConfig.viewDistance,
      maxPlayers: dto.maxPlayers ?? currentConfig.maxPlayers,
      serverDescription: dto.serverDescription ?? currentConfig.serverDescription,
      dockerImage: dto.dockerImage ?? currentConfig.dockerImage,
      restartPolicy: dto.restartPolicy ?? currentConfig.restartPolicy,
      tz: dto.tz ?? currentConfig.tz,
      envVars: dto.envVars ?? currentConfig.envVars,
      bindAddr: dto.bindAddr ?? currentConfig.bindAddr,
      autoDownload: dto.autoDownload ?? currentConfig.autoDownload,
    };

    const composeContent = this.composeFactory.createHytaleCompose(updatedConfig);
    await fs.writeFile(this.getDockerComposePath(serverId), composeContent);

    return this.getServerConfig(serverId) as Promise<HytaleConfig>;
  }

  /**
   * Delete a server
   */
  async deleteServer(serverId: string): Promise<boolean> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }

    const serverPath = this.getServerPath(serverId);
    if (!(await fs.pathExists(serverPath))) {
      throw new NotFoundException(`Server "${serverId}" not found`);
    }

    // Stop server first
    await this.stopServer(serverId);

    // Remove directory
    await fs.remove(serverPath);

    this.logger.log(`Deleted Hytale server: ${serverId}`);
    return true;
  }

  /**
   * Get server status
   */
  async getServerStatus(serverId: string): Promise<HytaleServerStatus> {
    if (!this.validateServerId(serverId)) {
      return 'not_found';
    }

    try {
      const { stdout } = await execAsync(
        `docker ps -a --filter "name=^/${serverId}$" --format "{{.ID}}"`,
      );

      if (!stdout.trim()) {
        const composePath = this.getDockerComposePath(serverId);
        if (await fs.pathExists(composePath)) {
          return 'stopped';
        }
        return 'not_found';
      }

      const containerId = stdout.trim().split('\n')[0];
      const { stdout: status } = await execAsync(
        `docker inspect --format="{{.State.Status}}" ${containerId}`,
      );

      const state = status.trim().toLowerCase();
      if (state.includes('running')) return 'running';
      if (state.includes('restarting') || state.includes('created')) return 'starting';
      return 'stopped';
    } catch (error) {
      this.logger.error(`Failed to get status for ${serverId}`, error);
      return 'not_found';
    }
  }

  /**
   * Get all servers status
   */
  async getAllServersStatus(): Promise<Record<string, HytaleServerStatus>> {
    const serverIds = await this.getAllServerIds();
    const statusMap: Record<string, HytaleServerStatus> = {};

    for (const id of serverIds) {
      statusMap[id] = await this.getServerStatus(id);
    }

    return statusMap;
  }

  /**
   * Start a server
   */
  async startServer(serverId: string): Promise<boolean> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }

    const composePath = this.getDockerComposePath(serverId);
    if (!(await fs.pathExists(composePath))) {
      throw new NotFoundException(`Server "${serverId}" not found`);
    }

    try {
      const composeDir = path.dirname(composePath);
      await execAsync('docker compose up -d', { cwd: composeDir });
      this.logger.log(`Started Hytale server: ${serverId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to start ${serverId}`, error);
      return false;
    }
  }

  /**
   * Stop a server
   */
  async stopServer(serverId: string): Promise<boolean> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }

    const composePath = this.getDockerComposePath(serverId);
    if (!(await fs.pathExists(composePath))) {
      return true; // Already doesn't exist
    }

    try {
      const composeDir = path.dirname(composePath);
      await execAsync('docker compose down', { cwd: composeDir });
      this.logger.log(`Stopped Hytale server: ${serverId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to stop ${serverId}`, error);
      return false;
    }
  }

  /**
   * Restart a server
   */
  async restartServer(serverId: string): Promise<boolean> {
    await this.stopServer(serverId);
    return this.startServer(serverId);
  }

  /**
   * Get server logs
   */
  async getServerLogs(serverId: string, lines: number = 100): Promise<HytaleLogsResponse> {
    if (!this.validateServerId(serverId)) {
      return {
        logs: 'Invalid server ID',
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found',
      };
    }

    const status = await this.getServerStatus(serverId);
    const result = await this.attachStrategy.getLogs(serverId, lines);

    return {
      logs: result.logs,
      hasErrors: result.hasErrors,
      lastUpdate: result.lastUpdate,
      status,
    };
  }

  /**
   * Get server info
   */
  async getServerInfo(serverId: string): Promise<HytaleServerInfo> {
    if (!this.validateServerId(serverId)) {
      return { exists: false, status: 'not_found', error: 'Invalid server ID' };
    }

    const status = await this.getServerStatus(serverId);
    const composePath = this.getDockerComposePath(serverId);
    const serverDataPath = this.getServerDataPath(serverId);

    return {
      exists: status !== 'not_found',
      status,
      dockerComposeExists: await fs.pathExists(composePath),
      serverDataExists: await fs.pathExists(serverDataPath),
    };
  }

  /**
   * Extract custom env vars (excluding known ones)
   */
  private extractCustomEnvVars(env: Record<string, string>): string {
    const knownVars = new Set([
      'TZ',
      'JAVA_XMS',
      'JAVA_XMX',
      'BIND_PORT',
      'BIND_ADDR',
      'AUTO_DOWNLOAD',
      'USE_G1GC',
      'VIEW_DISTANCE',
      'MAX_PLAYERS',
      'SERVER_NAME',
    ]);

    const customVars: string[] = [];
    for (const [key, value] of Object.entries(env)) {
      if (!knownVars.has(key) && value !== undefined) {
        customVars.push(`${key}=${value}`);
      }
    }

    return customVars.join('\n');
  }
}
