import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'fs-extra';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Settings } from 'src/users/entities/settings.entity';
import { DiscordService } from 'src/discord/discord.service';
import { ConfigService } from '@nestjs/config';

const execAsync = promisify(exec);

const DOCKER_COMMANDS = {
  COMPOSE_DOWN: 'docker compose down',
  COMPOSE_UP: 'docker compose up -d',
  PS_FILTER: (serverId: string) => `docker ps -a --filter "name=^/${serverId}$" --format "{{.ID}}"`,
  PS_PARTIAL: (serverId: string) => `docker ps -a --filter "name=${serverId}" --format "{{.ID}}"`,
  INSPECT_STATUS: (containerId: string) => `docker inspect --format="{{.State.Status}}" ${containerId}`,
  STATS_CPU: (containerId: string) => `docker stats ${containerId} --no-stream --format "{{.CPUPerc}}"`,
  STATS_MEM: (containerId: string) => `docker stats ${containerId} --no-stream --format "{{.MemUsage}}"`,
  LOGS: (containerId: string, lines: number) => `docker logs --tail ${lines} --timestamps ${containerId} 2>&1`,
  LOGS_SINCE: (containerId: string, since: string) => `docker logs --since ${since} --timestamps ${containerId} 2>&1`,
  EXEC_RCON: (containerId: string, port: string, password: string, command: string) => {
    const passwordArg = password ? ' --password ' + password : '';
    return `docker exec -i ${containerId} rcon-cli --port ${port}${passwordArg} "${command}"`;
  },
  VOLUME_LIST: (serverId: string) => `docker volume ls --filter "name=${serverId}" --format "{{.Name}}"`,
  VOLUME_REMOVE: (volume: string) => `docker volume rm ${volume}`,
  DU_SIZE: (worldPath: string) => `du -sb "${worldPath}" | cut -f1`,
} as const;

export type ServerStatus = 'running' | 'stopped' | 'starting' | 'not_found';

export interface ServerInfo {
  exists: boolean;
  status: ServerStatus;
  dockerComposeExists?: boolean;
  mcDataExists?: boolean;
  worldSize?: number;
  lastUpdated?: Date | null;
  worldSizeFormatted?: string;
  error?: string;
}

export interface ServerLogsResponse {
  logs: string;
  hasErrors: boolean;
  lastUpdate: Date;
  status: ServerStatus;
  metadata?: {
    totalLines: number;
    errorCount: number;
    warningCount: number;
  };
  hasNewContent?: boolean;
}

export interface CommandExecutionResponse {
  success: boolean;
  output: string;
}

@Injectable()
export class ServerManagementService {
  private readonly logger = new Logger(ServerManagementService.name);
  private readonly SERVERS_DIR: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    private readonly discordService: DiscordService,
  ) {
    this.SERVERS_DIR = this.configService.get('serversDir');
    fs.ensureDirSync(this.SERVERS_DIR);
  }

  private validateServerId(serverId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(serverId);
  }

  private async serverExists(serverId: string): Promise<boolean> {
    return fs.pathExists(path.join(this.SERVERS_DIR, serverId));
  }

  private getDockerComposePath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'docker-compose.yml');
  }

  private getMcDataPath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'mc-data');
  }

  private async getUserSettings(): Promise<{ webhook: string | null; lang: 'en' | 'es' }> {
    try {
      const settings = await this.settingsRepo.findOne({
        where: { discordWebhook: Not(IsNull()) },
        order: { id: 'ASC' },
      });
      return {
        webhook: settings?.discordWebhook || null,
        lang: settings?.language as 'en' | 'es',
      };
    } catch (error) {
      this.logger.warn('Failed to get user settings', error);
      return { webhook: null, lang: 'es' };
    }
  }

  private async sendDiscordNotification(type: 'created' | 'deleted' | 'started' | 'stopped' | 'restarted' | 'error' | 'warning', serverName: string, details?: { port?: string; players?: string; version?: string; reason?: string }): Promise<void> {
    try {
      const { webhook, lang } = await this.getUserSettings();
      if (webhook) {
        await this.discordService.sendServerNotification(webhook, type, serverName, lang, details);
      }
    } catch (error) {
      this.logger.error('Discord notification error', error);
    }
  }

  private async findContainerId(serverId: string): Promise<string> {
    if (!this.validateServerId(serverId)) {
      throw new Error(`Invalid server ID: ${serverId}`);
    }

    const { stdout } = await execAsync(DOCKER_COMMANDS.PS_FILTER(serverId));
    if (stdout.trim()) {
      const containerIds = stdout
        .trim()
        .split('\n')
        .filter((id) => id.trim());
      if (containerIds.length > 1) {
        this.logger.warn(`Multiple exact matches found for server "${serverId}". Using first: ${containerIds[0]}. ` + `Found: ${containerIds.join(', ')}`);
      }
      return containerIds[0];
    }

    this.logger.debug(`No container found with exact name matching "${serverId}"`);
    return '';
  }

  async restartServer(serverId: string): Promise<boolean> {
    try {
      if (!this.validateServerId(serverId)) {
        this.logger.error(`Invalid server ID: ${serverId}`);
        return false;
      }

      const dockerComposePath = this.getDockerComposePath(serverId);
      if (!(await fs.pathExists(dockerComposePath))) {
        this.logger.error(`Docker compose file does not exist for server ${serverId}`);
        return false;
      }

      const composeDir = path.dirname(dockerComposePath);
      await execAsync(DOCKER_COMMANDS.COMPOSE_DOWN, { cwd: composeDir });
      await execAsync(DOCKER_COMMANDS.COMPOSE_UP, { cwd: composeDir });

      this.logger.log(`Server ${serverId} restarted successfully`);
      await this.sendDiscordNotification('restarted', serverId);

      return true;
    } catch (error) {
      this.logger.error(`Failed to restart server ${serverId}`, error);
      await this.sendDiscordNotification('error', serverId, { reason: 'Failed to restart server' });
      return false;
    }
  }

  async clearServerData(serverId: string): Promise<boolean> {
    try {
      if (!this.validateServerId(serverId)) {
        this.logger.error(`Invalid server ID: ${serverId}`);
        return false;
      }

      const serverDataDir = this.getMcDataPath(serverId);
      const dockerComposePath = this.getDockerComposePath(serverId);

      if (await fs.pathExists(dockerComposePath)) {
        const composeDir = path.dirname(dockerComposePath);
        await execAsync(DOCKER_COMMANDS.COMPOSE_DOWN, { cwd: composeDir });
      }

      if (await fs.pathExists(serverDataDir)) {
        await fs.remove(serverDataDir);
        await fs.ensureDir(serverDataDir);
        this.logger.log(`Server data cleared for ${serverId}`);
        return true;
      }

      this.logger.warn(`Server data directory not found for ${serverId}`);
      return false;
    } catch (error) {
      this.logger.error(`Failed to clear data for server "${serverId}"`, error);
      return false;
    }
  }

  async getServerStatus(serverId: string): Promise<ServerStatus> {
    try {
      if (!this.validateServerId(serverId)) {
        this.logger.error(`Invalid server ID: ${serverId}`);
        return 'not_found';
      }

      if (!(await this.serverExists(serverId))) {
        return 'not_found';
      }

      const containerId = await this.findContainerId(serverId);

      if (containerId) {
        const { stdout } = await execAsync(DOCKER_COMMANDS.INSPECT_STATUS(containerId));
        const status = stdout.trim().toLowerCase();

        if (status.includes('restarting') || status.includes('created')) return 'starting';
        if (status.includes('running')) return 'running';
        if (status.includes('paused') || status.includes('exited') || status.includes('dead')) return 'stopped';
        return 'stopped';
      }

      if (await fs.pathExists(this.getDockerComposePath(serverId))) {
        return 'stopped';
      }

      return 'not_found';
    } catch (error) {
      this.logger.error(`Failed to get status for server ${serverId}`, error);
      return 'not_found';
    }
  }

  async getAllServersStatus(): Promise<Record<string, ServerStatus>> {
    try {
      const directories = await fs.readdir(this.SERVERS_DIR);
      const serverDirectories = await Promise.all(
        directories.map(async (dir) => {
          const fullPath = path.join(this.SERVERS_DIR, dir);
          const isDirectory = (await fs.stat(fullPath)).isDirectory();
          const hasDockerCompose = await fs.pathExists(this.getDockerComposePath(dir));
          return isDirectory && hasDockerCompose ? dir : null;
        }),
      );

      const validServers = serverDirectories.filter((dir): dir is string => dir !== null);
      const statusPromises = validServers.map(async (serverId) => ({
        serverId,
        status: await this.getServerStatus(serverId),
      }));

      const statusResults = await Promise.all(statusPromises);
      return statusResults.reduce(
        (acc, { serverId, status }) => {
          acc[serverId] = status;
          return acc;
        },
        {} as Record<string, ServerStatus>,
      );
    } catch (error) {
      this.logger.error('Error obtaining all servers status', error);
      return {};
    }
  }

  async getServerInfo(serverId: string): Promise<ServerInfo> {
    try {
      if (!this.validateServerId(serverId)) {
        this.logger.error(`Invalid server ID: ${serverId}`);
        return {
          exists: false,
          status: 'not_found',
          error: 'Invalid server ID',
        };
      }

      const status = await this.getServerStatus(serverId);
      if (status === 'not_found') {
        return {
          exists: false,
          status,
        };
      }

      const dockerComposePath = this.getDockerComposePath(serverId);
      const mcDataPath = this.getMcDataPath(serverId);

      const dockerComposeExists = await fs.pathExists(dockerComposePath);
      const mcDataExists = await fs.pathExists(mcDataPath);

      let worldSize = 0;
      let lastUpdated: Date | null = null;

      if (mcDataExists) {
        const worldPath = path.join(mcDataPath, 'world');
        if (await fs.pathExists(worldPath)) {
          const { stdout } = await execAsync(DOCKER_COMMANDS.DU_SIZE(worldPath));
          worldSize = Number.parseInt(stdout.trim(), 10);
          const stats = await fs.stat(worldPath);
          lastUpdated = stats.mtime;
        }
      }

      return {
        exists: true,
        status,
        dockerComposeExists,
        mcDataExists,
        worldSize,
        lastUpdated,
        worldSizeFormatted: this.formatBytes(worldSize),
      };
    } catch (error) {
      this.logger.error(`Failed to get info for server ${serverId}`, error);
      return {
        exists: false,
        status: 'not_found',
        error: error.message,
      };
    }
  }

  async deleteServer(serverId: string): Promise<boolean> {
    try {
      if (!this.validateServerId(serverId)) {
        this.logger.error(`Invalid server ID: ${serverId}`);
        return false;
      }

      const serverDir = path.join(this.SERVERS_DIR, serverId);
      const dockerComposePath = this.getDockerComposePath(serverId);

      if (!(await fs.pathExists(serverDir))) {
        this.logger.error(`Server directory does not exist for server ${serverId}`);
        return false;
      }

      if (await fs.pathExists(dockerComposePath)) {
        const composeDir = path.dirname(dockerComposePath);
        try {
          await execAsync(DOCKER_COMMANDS.COMPOSE_DOWN, { cwd: composeDir });
        } catch (error) {
          this.logger.warn(`Could not stop server ${serverId} before deletion`, error);
        }
      }

      await fs.remove(serverDir);

      try {
        const { stdout: volumeList } = await execAsync(DOCKER_COMMANDS.VOLUME_LIST(serverId));
        if (volumeList.trim()) {
          const volumes = volumeList.trim().split('\n');
          for (const volume of volumes) {
            await execAsync(DOCKER_COMMANDS.VOLUME_REMOVE(volume));
          }
        }
      } catch (error) {
        this.logger.warn(`Could not clean up docker volumes for ${serverId}`, error);
      }

      this.logger.log(`Server ${serverId} deleted successfully`);
      await this.sendDiscordNotification('deleted', serverId);

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete server ${serverId}`, error);
      await this.sendDiscordNotification('error', serverId, { reason: 'Failed to delete server' });
      return false;
    }
  }

  async getServerResources(serverId: string): Promise<{
    cpuUsage: string;
    memoryUsage: string;
    memoryLimit: string;
  }> {
    try {
      if (!this.validateServerId(serverId)) {
        throw new Error(`Invalid server ID: ${serverId}`);
      }

      const containerId = await this.findContainerId(serverId);
      if (!containerId) throw new Error('Container not found or not running');

      const { stdout: cpuStats } = await execAsync(DOCKER_COMMANDS.STATS_CPU(containerId));
      const { stdout: memStats } = await execAsync(DOCKER_COMMANDS.STATS_MEM(containerId));

      const memoryParts = memStats.trim().split(' / ');
      return {
        cpuUsage: cpuStats.trim(),
        memoryUsage: memoryParts[0],
        memoryLimit: memoryParts[1] || 'N/A',
      };
    } catch (error) {
      this.logger.error(`Failed to get resource usage for server ${serverId}`, error);
      return {
        cpuUsage: 'N/A',
        memoryUsage: 'N/A',
        memoryLimit: 'N/A',
      };
    }
  }

  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = Math.max(0, decimals);
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async getServerLogs(serverId: string, lines: number = 100): Promise<ServerLogsResponse> {
    try {
      if (!this.validateServerId(serverId)) {
        return {
          logs: 'Invalid server ID',
          hasErrors: true,
          lastUpdate: new Date(),
          status: 'not_found',
        };
      }

      if (!(await this.serverExists(serverId))) {
        return {
          logs: 'Server not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: 'not_found',
        };
      }

      const containerId = await this.findContainerId(serverId);
      const serverStatus = await this.getServerStatus(serverId);

      if (!containerId) {
        return {
          logs: 'Container not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: serverStatus,
        };
      }

      const { stdout: logs } = await execAsync(DOCKER_COMMANDS.LOGS(containerId, lines));
      const logAnalysis = this.analyzeLogs(logs);

      return {
        logs,
        hasErrors: logAnalysis.hasErrors,
        lastUpdate: new Date(),
        status: serverStatus,
        metadata: {
          totalLines: logAnalysis.totalLines,
          errorCount: logAnalysis.errorCount,
          warningCount: logAnalysis.warningCount,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get logs for server ${serverId}`, error);
      return {
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found',
      };
    }
  }

  private analyzeLogs(logs: string): {
    hasErrors: boolean;
    totalLines: number;
    errorCount: number;
    warningCount: number;
  } {
    if (!logs) {
      return { hasErrors: false, totalLines: 0, errorCount: 0, warningCount: 0 };
    }

    const lines = logs.split('\n').filter((line) => line.trim());
    const errorPatterns = [/ERROR/gi, /SEVERE/gi, /FATAL/gi, /Exception/gi, /java\.lang\./gi, /Caused by:/gi, /\[STDERR\]/gi, /Failed to/gi, /Cannot/gi, /Unable to/gi, /\[Server thread\/ERROR\]/gi, /IllegalArgumentException/gi, /NullPointerException/gi, /OutOfMemoryError/gi, /StackOverflowError/gi, /Connection refused/gi, /Timeout/gi, /Permission denied/gi];
    const warningPatterns = [/WARN/gi, /WARNING/gi, /\[Server thread\/WARN\]/gi, /deprecated/gi, /outdated/gi, /could not/gi, /missing/gi, /slow/gi, /lag/gi];

    let errorCount = 0;
    let warningCount = 0;

    for (const line of lines) {
      if (errorPatterns.some((pattern) => pattern.test(line))) {
        errorCount++;
      } else if (warningPatterns.some((pattern) => pattern.test(line))) {
        warningCount++;
      }
    }

    return {
      hasErrors: errorCount > 0,
      totalLines: lines.length,
      errorCount,
      warningCount,
    };
  }

  async getServerLogsStream(
    serverId: string,
    lines: number = 100,
    since?: string,
  ): Promise<{
    logs: string;
    hasErrors: boolean;
    lastUpdate: Date;
    status: 'running' | 'stopped' | 'starting' | 'not_found';
    lastTimestamp?: string;
    metadata?: {
      totalLines: number;
      errorCount: number;
      warningCount: number;
    };
  }> {
    try {
      if (!(await fs.pathExists(path.join(this.SERVERS_DIR, serverId)))) {
        return {
          logs: 'Server not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: 'not_found',
        };
      }

      const containerId = await this.findContainerId(serverId);
      const serverStatus = await this.getServerStatus(serverId);

      if (!containerId) {
        return {
          logs: 'Container not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: serverStatus,
        };
      }

      let dockerCommand: string;
      if (since) {
        dockerCommand = `docker logs --since ${since} --timestamps ${containerId} 2>&1`;
      } else {
        dockerCommand = `docker logs --tail ${lines} --timestamps ${containerId} 2>&1`;
      }

      const { stdout: logs } = await execAsync(dockerCommand);
      const logAnalysis = this.analyzeLogs(logs);

      let lastTimestamp: string | undefined;
      if (logs) {
        const lines = logs.split('\n').filter((line) => line.trim());
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          const timestampMatch = lastLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
          if (timestampMatch) {
            const timestamp = new Date(timestampMatch[1]);
            timestamp.setMilliseconds(timestamp.getMilliseconds() + 1);
            lastTimestamp = timestamp.toISOString();
          }
        }
      }

      return {
        logs,
        hasErrors: logAnalysis.hasErrors,
        lastUpdate: new Date(),
        status: serverStatus,
        lastTimestamp,
        metadata: {
          totalLines: logAnalysis.totalLines,
          errorCount: logAnalysis.errorCount,
          warningCount: logAnalysis.warningCount,
        },
      };
    } catch (error) {
      console.error(`Failed to get logs stream for server ${serverId}:`, error);
      return {
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found',
      };
    }
  }

  async getServerLogsSince(serverId: string, timestamp: string): Promise<ServerLogsResponse> {
    try {
      if (!this.validateServerId(serverId)) {
        return {
          logs: 'Invalid server ID',
          hasErrors: true,
          lastUpdate: new Date(),
          status: 'not_found',
          hasNewContent: false,
        };
      }

      if (!(await this.serverExists(serverId))) {
        return {
          logs: 'Server not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: 'not_found',
          hasNewContent: false,
        };
      }

      const containerId = await this.findContainerId(serverId);
      const serverStatus = await this.getServerStatus(serverId);

      if (!containerId) {
        return {
          logs: 'Container not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: serverStatus,
          hasNewContent: false,
        };
      }

      const { stdout: logs } = await execAsync(DOCKER_COMMANDS.LOGS_SINCE(containerId, timestamp));
      const hasNewContent = logs.trim().length > 0;
      const logAnalysis = this.analyzeLogs(logs);

      return {
        logs,
        hasErrors: logAnalysis.hasErrors,
        lastUpdate: new Date(),
        status: serverStatus,
        hasNewContent,
      };
    } catch (error) {
      this.logger.error(`Failed to get logs since ${timestamp} for server ${serverId}`, error);
      return {
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found',
        hasNewContent: false,
      };
    }
  }

  async executeCommand(serverId: string, command: string, rconPort: string, rconPassword?: string): Promise<CommandExecutionResponse> {
    try {
      if (!this.validateServerId(serverId)) {
        return { success: false, output: 'Invalid server ID' };
      }

      if (!(await this.serverExists(serverId))) {
        return { success: false, output: 'Server not found' };
      }

      const containerId = await this.findContainerId(serverId);
      if (!containerId) {
        return { success: false, output: 'Container not found or not running' };
      }

      const { stdout, stderr } = await execAsync(DOCKER_COMMANDS.EXEC_RCON(containerId, rconPort, rconPassword || '', command));

      if (stderr) {
        this.logger.warn(`Command execution error on ${serverId}: ${stderr}`);
        return { success: false, output: `Error executing command: ${stderr}` };
      }

      this.logger.log(`Command executed on ${serverId}: ${command}`);
      return { success: true, output: stdout || 'Command executed successfully' };
    } catch (error) {
      this.logger.error(`Error executing command on server ${serverId}`, error);
      return { success: false, output: `Error: ${error.message}` };
    }
  }

  async startServer(serverId: string): Promise<boolean> {
    try {
      if (!this.validateServerId(serverId)) {
        this.logger.error(`Invalid server ID: ${serverId}`);
        return false;
      }

      const dockerComposePath = this.getDockerComposePath(serverId);
      if (!(await fs.pathExists(dockerComposePath))) {
        this.logger.error(`Docker compose file does not exist for server ${serverId}`);
        return false;
      }

      const mcDataPath = this.getMcDataPath(serverId);
      if (await fs.pathExists(mcDataPath)) {
        const entries = await fs.readdir(mcDataPath);
        if (entries.length === 0) {
          this.logger.warn(`Server ${serverId}: mc-data folder is empty. The server will generate a new world. ` + `If you uploaded existing server data, make sure it's placed in servers/${serverId}/mc-data/`);
        }
      }

      const composeDir = path.dirname(dockerComposePath);

      if ((await this.getServerStatus(serverId)) !== 'not_found') {
        await execAsync(DOCKER_COMMANDS.COMPOSE_DOWN, { cwd: composeDir });
      }

      await execAsync(DOCKER_COMMANDS.COMPOSE_UP, { cwd: composeDir });

      this.logger.log(`Server ${serverId} started successfully`);
      await this.sendDiscordNotification('started', serverId);

      return true;
    } catch (error) {
      this.logger.error(`Failed to start server ${serverId}`, error);
      await this.sendDiscordNotification('error', serverId, { reason: 'Failed to start server' });
      return false;
    }
  }

  async stopServer(serverId: string): Promise<boolean> {
    try {
      if (!this.validateServerId(serverId)) {
        this.logger.error(`Invalid server ID: ${serverId}`);
        return false;
      }

      const dockerComposePath = this.getDockerComposePath(serverId);
      if (!(await fs.pathExists(dockerComposePath))) {
        this.logger.error(`Docker compose file does not exist for server ${serverId}`);
        return false;
      }

      const composeDir = path.dirname(dockerComposePath);
      await execAsync(DOCKER_COMMANDS.COMPOSE_DOWN, { cwd: composeDir });

      this.logger.log(`Server ${serverId} stopped successfully`);
      await this.sendDiscordNotification('stopped', serverId);

      return true;
    } catch (error) {
      this.logger.error(`Failed to stop server ${serverId}`, error);
      await this.sendDiscordNotification('error', serverId, { reason: 'Failed to stop server' });
      return false;
    }
  }
}
