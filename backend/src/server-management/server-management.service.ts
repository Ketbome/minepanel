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
    // First try direct match (container named exactly as serverId)
    const { stdout } = await execAsync(`docker ps -a --filter "name=^/${serverId}$" --format "{{.ID}}"`);

    if (stdout.trim()) {
      return stdout.trim();
    }

    // Fallback: if exact match fails, try partial match
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

      // Execute docker compose commands from the directory containing the docker-compose.yml
      const composeDir = path.dirname(dockerComposePath);

      // Stop the server if it's running
      await execAsync('docker compose down', { cwd: composeDir });
      // Start the server
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
        // Stop the server first
        const composeDir = path.dirname(dockerComposePath);
        await execAsync('docker compose down', { cwd: composeDir });
      }

      if (await fs.pathExists(serverDataDir)) {
        // Remove server data
        await fs.remove(serverDataDir);

        // Create empty directory
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
      // First check if the directory exists
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
        return 'not_found';
      }

      // Get container ID using our flexible pattern helper
      const containerId = await this.findContainerId(serverId);

      if (containerId) {
        // Get container status details
        const { stdout } = await execAsync(`docker inspect --format="{{.State.Status}}:{{.State.Health.Status}}" ${containerId}`);

        // Check if the status indicates it's still starting
        if (stdout.includes('starting') || stdout.includes('health: starting')) {
          return 'starting';
        }

        if (stdout.includes('running')) {
          return 'running';
        }

        return 'stopped';
      }

      // If docker compose file exists but no container, consider it stopped
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
      // Primero, obtener la lista de directorios de servidores
      const directories = await fs.readdir(this.BASE_DIR);
      const serverDirectories = await Promise.all(
        directories.map(async (dir) => {
          const fullPath = path.join(this.BASE_DIR, dir);
          const isDirectory = (await fs.stat(fullPath)).isDirectory();
          const hasDockerCompose = await fs.pathExists(this.getDockerComposePath(dir));
          // Solo considerar como servidor si es un directorio y tiene un docker-compose.yml
          return isDirectory && hasDockerCompose ? dir : null;
        }),
      );

      // Filtrar los nulos y obtener el estado de cada servidor
      const validServerDirectories = serverDirectories.filter(Boolean);
      const statusPromises = validServerDirectories.map(async (serverId) => {
        return { serverId, status: await this.getServerStatus(serverId) };
      });

      // Esperar todas las promesas de estado
      const statusResults = await Promise.all(statusPromises);

      // Convertir a objeto con pares clave-valor
      const result = statusResults.reduce((acc, { serverId, status }) => {
        acc[serverId] = status;
        return acc;
      }, {});

      return result;
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
        // Calculate directory size
        const worldPath = path.join(mcDataPath, 'world');
        if (await fs.pathExists(worldPath)) {
          const { stdout } = await execAsync(`du -sb "${worldPath}" | cut -f1`);
          worldSize = parseInt(stdout.trim(), 10);

          // Get last modified time
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

      // Check if server exists
      if (!(await fs.pathExists(serverDir))) {
        console.error(`Server directory does not exist for server ${serverId}`);
        return false;
      }

      // If docker compose exists, stop the server first
      if (await fs.pathExists(dockerComposePath)) {
        const composeDir = path.dirname(dockerComposePath);
        try {
          // Stop any running containers
          await execAsync('docker compose down', { cwd: composeDir });
        } catch (error) {
          console.warn(`Warning: Could not stop server ${serverId} before deletion:`, error);
          // Continue with deletion even if stopping fails
        }
      }

      // Delete the server directory
      await fs.remove(serverDir);

      // Remove any docker volumes associated with this server
      try {
        // Look for volumes with this server name pattern
        const { stdout: volumeList } = await execAsync(`docker volume ls --filter "name=${serverId}" --format "{{.Name}}"`);

        if (volumeList.trim()) {
          const volumes = volumeList.trim().split('\n');
          for (const volume of volumes) {
            await execAsync(`docker volume rm ${volume}`);
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not clean up docker volumes for ${serverId}:`, error);
        // Continue with deletion even if volume cleanup fails
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
      // Get container ID using our flexible pattern helper
      const containerId = await this.findContainerId(serverId);

      if (!containerId) {
        throw new Error('Container not found or not running');
      }

      // Get CPU usage
      const { stdout: cpuStats } = await execAsync(`docker stats ${containerId} --no-stream --format "{{.CPUPerc}}"`);

      // Get memory usage
      const { stdout: memStats } = await execAsync(`docker stats ${containerId} --no-stream --format "{{.MemUsage}}"`);

      // Split memory usage into used and limit
      const memoryParts = memStats.trim().split(' / ');
      const memoryUsage = memoryParts[0];
      const memoryLimit = memoryParts[1] || 'N/A';

      return {
        cpuUsage: cpuStats.trim(),
        memoryUsage,
        memoryLimit,
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

  // Helper to format bytes to a human-readable format
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async getServerLogs(serverId: string, lines: number = 100): Promise<{ 
    logs: string; 
    hasErrors: boolean; 
    lastUpdate: Date;
    status: 'running' | 'stopped' | 'starting' | 'not_found';
    metadata?: {
      totalLines: number;
      errorCount: number;
      warningCount: number;
    }
  }> {
    try {
      // Check if the server exists
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
        return { 
          logs: 'Server not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: 'not_found'
        };
      }

      // Get container ID using our flexible pattern helper
      const containerId = await this.findContainerId(serverId);
      const serverStatus = await this.getServerStatus(serverId);

      if (!containerId) {
        return { 
          logs: 'Container not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: serverStatus
        };
      }

      // Get logs from the container with timestamps
      const { stdout: logs, stderr } = await execAsync(`docker logs --tail ${lines} --timestamps ${containerId} 2>&1`);

      // Analyze logs for errors and warnings
      const logAnalysis = this.analyzeLogs(logs);

      return { 
        logs,
        hasErrors: logAnalysis.hasErrors,
        lastUpdate: new Date(),
        status: serverStatus,
        metadata: {
          totalLines: logAnalysis.totalLines,
          errorCount: logAnalysis.errorCount,
          warningCount: logAnalysis.warningCount
        }
      };
    } catch (error) {
      console.error(`Failed to get logs for server ${serverId}:`, error);
      return { 
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found'
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
      return {
        hasErrors: false,
        totalLines: 0,
        errorCount: 0,
        warningCount: 0
      };
    }

    const lines = logs.split('\n').filter(line => line.trim());
    const totalLines = lines.length;

    // Error patterns for Minecraft servers
    const errorPatterns = [
      /ERROR/gi,
      /SEVERE/gi, 
      /FATAL/gi,
      /Exception/gi,
      /java\.lang\./gi,
      /Caused by:/gi,
      /\[STDERR\]/gi,
      /Failed to/gi,
      /Cannot/gi,
      /Unable to/gi,
      /\[Server thread\/ERROR\]/gi,
      /IllegalArgumentException/gi,
      /NullPointerException/gi,
      /OutOfMemoryError/gi,
      /StackOverflowError/gi,
      /Connection refused/gi,
      /Timeout/gi,
      /Permission denied/gi
    ];

    // Warning patterns
    const warningPatterns = [
      /WARN/gi,
      /WARNING/gi,
      /\[Server thread\/WARN\]/gi,
      /deprecated/gi,
      /outdated/gi,
      /could not/gi,
      /missing/gi,
      /slow/gi,
      /lag/gi
    ];

    let errorCount = 0;
    let warningCount = 0;

    lines.forEach(line => {
      // Count errors
      errorPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          errorCount++;
        }
      });

      // Count warnings (but don't double count errors as warnings)
      if (!errorPatterns.some(pattern => pattern.test(line))) {
        warningPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            warningCount++;
          }
        });
      }
    });

    return {
      hasErrors: errorCount > 0,
      totalLines,
      errorCount,
      warningCount
    };
  }

  async getServerLogsStream(serverId: string, lines: number = 100, since?: string): Promise<{ 
    logs: string; 
    hasErrors: boolean; 
    lastUpdate: Date;
    status: 'running' | 'stopped' | 'starting' | 'not_found';
    metadata?: {
      totalLines: number;
      errorCount: number;
      warningCount: number;
    }
  }> {
    try {
      // Check if the server exists
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
        return { 
          logs: 'Server not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: 'not_found'
        };
      }

      // Get container ID using our flexible pattern helper
      const containerId = await this.findContainerId(serverId);
      const serverStatus = await this.getServerStatus(serverId);

      if (!containerId) {
        return { 
          logs: 'Container not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: serverStatus
        };
      }

      // Build docker logs command with optional since parameter
      let dockerCommand = `docker logs --tail ${lines} --timestamps`;
      if (since) {
        dockerCommand += ` --since ${since}`;
      }
      dockerCommand += ` ${containerId} 2>&1`;

      // Get logs from the container with timestamps
      const { stdout: logs, stderr } = await execAsync(dockerCommand);

      // Analyze logs for errors and warnings
      const logAnalysis = this.analyzeLogs(logs);

      return { 
        logs,
        hasErrors: logAnalysis.hasErrors,
        lastUpdate: new Date(),
        status: serverStatus,
        metadata: {
          totalLines: logAnalysis.totalLines,
          errorCount: logAnalysis.errorCount,
          warningCount: logAnalysis.warningCount
        }
      };
    } catch (error) {
      console.error(`Failed to get logs stream for server ${serverId}:`, error);
      return { 
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found'
      };
    }
  }

  async getServerLogsSince(serverId: string, timestamp: string, lines: number = 1000): Promise<{ 
    logs: string; 
    hasErrors: boolean; 
    lastUpdate: Date;
    status: 'running' | 'stopped' | 'starting' | 'not_found';
    hasNewContent: boolean;
  }> {
    try {
      // Check if the server exists
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
        return { 
          logs: 'Server not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: 'not_found',
          hasNewContent: false
        };
      }

      // Get container ID using our flexible pattern helper
      const containerId = await this.findContainerId(serverId);
      const serverStatus = await this.getServerStatus(serverId);

      if (!containerId) {
        return { 
          logs: 'Container not found',
          hasErrors: false,
          lastUpdate: new Date(),
          status: serverStatus,
          hasNewContent: false
        };
      }

      // Get logs since the specified timestamp
      const { stdout: logs, stderr } = await execAsync(`docker logs --since ${timestamp} --timestamps ${containerId} 2>&1`);

      // Check if there's new content
      const hasNewContent = logs.trim().length > 0;

      // Analyze logs for errors and warnings
      const logAnalysis = this.analyzeLogs(logs);

      return { 
        logs,
        hasErrors: logAnalysis.hasErrors,
        lastUpdate: new Date(),
        status: serverStatus,
        hasNewContent
      };
    } catch (error) {
      console.error(`Failed to get logs since ${timestamp} for server ${serverId}:`, error);
      return { 
        logs: `Error retrieving logs: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
        status: 'not_found',
        hasNewContent: false
      };
    }
  }

  async executeCommand(serverId: string, command: string, rconPort: string, rconPassword?: string): Promise<{ success: boolean; output: string }> {
    try {
      // Verificar si el servidor existe
      if (!(await fs.pathExists(path.join(this.BASE_DIR, serverId)))) {
        return {
          success: false,
          output: 'Servidor no encontrado',
        };
      }

      // Get container ID using our flexible pattern helper
      const containerId = await this.findContainerId(serverId);

      if (!containerId) {
        return {
          success: false,
          output: 'Contenedor no encontrado o no está en ejecución',
        };
      }

      let rconConfig = `--port ${rconPort}`;
      if (rconPassword) {
        rconConfig += ` --password ${rconPassword}`;
      }

      // Ejecutar el comando en la consola RCON del servidor Minecraft
      const { stdout, stderr } = await execAsync(`docker exec -i ${containerId} rcon-cli ${rconConfig} "${command}"`);

      if (stderr) {
        return {
          success: false,
          output: `Error al ejecutar comando: ${stderr}`,
        };
      }

      return {
        success: true,
        output: stdout || 'Comando ejecutado correctamente',
      };
    } catch (error) {
      console.error(`Error al ejecutar comando en servidor ${serverId}:`, error);
      return {
        success: false,
        output: `Error: ${error.message}`,
      };
    }
  }

  async startServer(serverId: string): Promise<boolean> {
    try {
      const dockerComposePath = this.getDockerComposePath(serverId);
      if (!(await fs.pathExists(dockerComposePath))) {
        console.error(`Docker compose file does not exist for server ${serverId}`);
        return false;
      }

      // Execute docker compose commands from the directory containing the docker-compose.yml
      const composeDir = this.getMcDataPath(serverId);

      if ((await this.getServerStatus(serverId)) !== 'not_found') {
        await execAsync('docker compose down', { cwd: composeDir });
      }

      // Start the server
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

      // Execute docker compose commands from the directory containing the docker-compose.yml
      const composeDir = path.dirname(dockerComposePath);

      // Stop the server
      await execAsync('docker compose down', { cwd: composeDir });

      return true;
    } catch (error) {
      console.error(`Failed to stop server ${serverId}:`, error);
      return false;
    }
  }
}
