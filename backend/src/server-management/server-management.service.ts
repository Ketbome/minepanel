import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs-extra';

const execAsync = promisify(exec);

@Injectable()
export class ServerManagementService {
  private readonly BASE_DIR = process.env.SERVERS_DIR || path.join(process.cwd(), '..', 'servers');

  private getDockerComposePath(serverId: string): string {
    return path.join(this.BASE_DIR, serverId, 'docker-compose.yml');
  }

  private getMcDataPath(serverId: string): string {
    return path.join(this.BASE_DIR, serverId, 'mc-data');
  }

  private async findContainerId(serverId: string): Promise<string> {
    const { stdout } = await execAsync(`docker ps -a --filter "name=^/${serverId}$" --format "{{.ID}}"`);
    if (stdout.trim()) return stdout.trim();

    const { stdout: partialMatch } = await execAsync(`docker ps -a --filter "name=${serverId}" --format "{{.ID}}"`);
    return partialMatch.trim();
  }

  async restartServer(serverId: string): Promise<boolean> {
    try {
      const dockerComposePath = this.getDockerComposePath(serverId);
      if (!(await fs.pathExists(dockerComposePath))) {
        console.error(`Docker compose file does not exist for server ${serverId}`);
        return false;
      }

      const composeDir = path.dirname(dockerComposePath);
      await execAsync('docker compose down', { cwd: composeDir });
      await execAsync('docker compose up -d', { cwd: composeDir });

      return true;
    } catch (error) {
      console.error(`Failed to restart server ${serverId}:`, error);
      return false;
    }
  }

  async clearServerData(serverId: string): Promise<boolean> {
    try {
      const serverDataDir = this.getMcDataPath(serverId);
      const dockerComposePath = this.getDockerComposePath(serverId);

      if (await fs.pathExists(dockerComposePath)) {
        const composeDir = path.dirname(dockerComposePath);
        await execAsync('docker compose down', { cwd: composeDir });
      }

      if (await fs.pathExists(serverDataDir)) {
        await fs.remove(serverDataDir);
        await fs.ensureDir(serverDataDir);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to clear data for server "${serverId}":`, error);
      return false;
    }
  }

  async getServerStatus(serverId: string): Promise<'running' | 'stopped' | 'starting' | 'not_found'> {
    try {
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
        return 'not_found';
      }

      const containerId = await this.findContainerId(serverId);

      if (containerId) {
        const { stdout } = await execAsync(`docker inspect --format="{{.State.Status}}:{{.State.Health.Status}}" ${containerId}`);

        if (stdout.includes('starting') || stdout.includes('health: starting')) return 'starting';
        if (stdout.includes('running')) return 'running';
        return 'stopped';
      }

      if (await fs.pathExists(this.getDockerComposePath(serverId))) {
        return 'stopped';
      }

      return 'not_found';
    } catch (error) {
      console.error(`Failed to get status for server ${serverId}:`, error);
      return 'not_found';
    }
  }

  async getAllServersStatus(): Promise<{ [serverId: string]: 'running' | 'stopped' | 'starting' | 'not_found' }> {
    try {
      const directories = await fs.readdir(this.BASE_DIR);
      const serverDirectories = await Promise.all(
        directories.map(async (dir) => {
          const fullPath = path.join(this.BASE_DIR, dir);
          const isDirectory = (await fs.stat(fullPath)).isDirectory();
          const hasDockerCompose = await fs.pathExists(this.getDockerComposePath(dir));
          return isDirectory && hasDockerCompose ? dir : null;
        }),
      );

      const validServers = serverDirectories.filter(Boolean);
      const statusPromises = validServers.map(async (serverId) => ({
        serverId,
        status: await this.getServerStatus(serverId),
      }));

      const statusResults = await Promise.all(statusPromises);
      return statusResults.reduce((acc, { serverId, status }) => {
        acc[serverId] = status;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error al obtener el estado de todos los servidores:', error);
      return {};
    }
  }

  async getServerInfo(serverId: string): Promise<any> {
    try {
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
      let lastUpdated = null;

      if (mcDataExists) {
        const worldPath = path.join(mcDataPath, 'world');
        if (await fs.pathExists(worldPath)) {
          const { stdout } = await execAsync(`du -sb "${worldPath}" | cut -f1`);
          worldSize = parseInt(stdout.trim(), 10);
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
      console.error(`Failed to get info for server ${serverId}:`, error);
      return {
        exists: false,
        status: 'error',
        error: error.message,
      };
    }
  }

  async deleteServer(serverId: string): Promise<boolean> {
    try {
      const serverDir = path.join(this.BASE_DIR, serverId);
      const dockerComposePath = this.getDockerComposePath(serverId);

      if (!(await fs.pathExists(serverDir))) {
        console.error(`Server directory does not exist for server ${serverId}`);
        return false;
      }

      if (await fs.pathExists(dockerComposePath)) {
        const composeDir = path.dirname(dockerComposePath);
        try {
          await execAsync('docker compose down', { cwd: composeDir });
        } catch (error) {
          console.warn(`Warning: Could not stop server ${serverId} before deletion:`, error);
        }
      }

      await fs.remove(serverDir);

      try {
        const { stdout: volumeList } = await execAsync(`docker volume ls --filter "name=${serverId}" --format "{{.Name}}"`);
        if (volumeList.trim()) {
          const volumes = volumeList.trim().split('\n');
          for (const volume of volumes) {
            await execAsync(`docker volume rm ${volume}`);
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not clean up docker volumes for ${serverId}:`, error);
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete server ${serverId}:`, error);
      return false;
    }
  }

  async getServerResources(serverId: string): Promise<{
    cpuUsage: string;
    memoryUsage: string;
    memoryLimit: string;
  }> {
    try {
      const containerId = await this.findContainerId(serverId);
      if (!containerId) throw new Error('Container not found or not running');

      const { stdout: cpuStats } = await execAsync(`docker stats ${containerId} --no-stream --format "{{.CPUPerc}}"`);
      const { stdout: memStats } = await execAsync(`docker stats ${containerId} --no-stream --format "{{.MemUsage}}"`);

      const memoryParts = memStats.trim().split(' / ');
      return {
        cpuUsage: cpuStats.trim(),
        memoryUsage: memoryParts[0],
        memoryLimit: memoryParts[1] || 'N/A',
      };
    } catch (error) {
      console.error(`Failed to get resource usage for server ${serverId}:`, error);
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
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async getServerLogs(
    serverId: string,
    lines: number = 100,
  ): Promise<{
    logs: string;
    hasErrors: boolean;
    lastUpdate: Date;
    status: 'running' | 'stopped' | 'starting' | 'not_found';
    metadata?: {
      totalLines: number;
      errorCount: number;
      warningCount: number;
    };
  }> {
    try {
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
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

      const { stdout: logs } = await execAsync(`docker logs --tail ${lines} --timestamps ${containerId} 2>&1`);
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
      console.error(`Failed to get logs for server ${serverId}:`, error);
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

    lines.forEach((line) => {
      if (errorPatterns.some((pattern) => pattern.test(line))) {
        errorCount++;
      } else if (warningPatterns.some((pattern) => pattern.test(line))) {
        warningCount++;
      }
    });

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
    metadata?: {
      totalLines: number;
      errorCount: number;
      warningCount: number;
    };
  }> {
    try {
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
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

      let dockerCommand = `docker logs --tail ${lines} --timestamps`;
      if (since) dockerCommand += ` --since ${since}`;
      dockerCommand += ` ${containerId} 2>&1`;

      const { stdout: logs } = await execAsync(dockerCommand);
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
      console.error(`Failed to get logs stream for server ${serverId}:`, error);
      return {
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found',
      };
    }
  }

  async getServerLogsSince(
    serverId: string,
    timestamp: string,
  ): Promise<{
    logs: string;
    hasErrors: boolean;
    lastUpdate: Date;
    status: 'running' | 'stopped' | 'starting' | 'not_found';
    hasNewContent: boolean;
  }> {
    try {
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
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

      const { stdout: logs } = await execAsync(`docker logs --since ${timestamp} --timestamps ${containerId} 2>&1`);
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
      console.error(`Failed to get logs since ${timestamp} for server ${serverId}:`, error);
      return {
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found',
        hasNewContent: false,
      };
    }
  }

  async executeCommand(serverId: string, command: string, rconPort: string, rconPassword?: string): Promise<{ success: boolean; output: string }> {
    try {
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
        return { success: false, output: 'Servidor no encontrado' };
      }

      const containerId = await this.findContainerId(serverId);
      if (!containerId) {
        return { success: false, output: 'Contenedor no encontrado o no está en ejecución' };
      }

      let rconConfig = `--port ${rconPort}`;
      if (rconPassword) rconConfig += ` --password ${rconPassword}`;

      const { stdout, stderr } = await execAsync(`docker exec -i ${containerId} rcon-cli ${rconConfig} "${command}"`);

      if (stderr) {
        return { success: false, output: `Error al ejecutar comando: ${stderr}` };
      }

      return { success: true, output: stdout || 'Comando ejecutado correctamente' };
    } catch (error) {
      console.error(`Error al ejecutar comando en servidor ${serverId}:`, error);
      return { success: false, output: `Error: ${error.message}` };
    }
  }

  async startServer(serverId: string): Promise<boolean> {
    try {
      const dockerComposePath = this.getDockerComposePath(serverId);
      if (!(await fs.pathExists(dockerComposePath))) {
        console.error(`Docker compose file does not exist for server ${serverId}`);
        return false;
      }

      const composeDir = this.getMcDataPath(serverId);

      if ((await this.getServerStatus(serverId)) !== 'not_found') {
        await execAsync('docker compose down', { cwd: composeDir });
      }

      await execAsync('docker compose up -d', { cwd: composeDir });
      return true;
    } catch (error) {
      console.error(`Failed to start server ${serverId}:`, error);
      return false;
    }
  }

  async stopServer(serverId: string): Promise<boolean> {
    try {
      const dockerComposePath = this.getDockerComposePath(serverId);
      if (!(await fs.pathExists(dockerComposePath))) {
        console.error(`Docker compose file does not exist for server ${serverId}`);
        return false;
      }

      const composeDir = path.dirname(dockerComposePath);
      await execAsync('docker compose down', { cwd: composeDir });
      return true;
    } catch (error) {
      console.error(`Failed to stop server ${serverId}:`, error);
      return false;
    }
  }
}
