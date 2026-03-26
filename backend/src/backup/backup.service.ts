import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import type { ExecOptions } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'fs-extra';

const execAsync = promisify(exec);

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: Date;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly SERVERS_DIR: string;
  private readonly COMPOSE_PROJECT?: string;

  constructor(private readonly configService: ConfigService) {
    this.SERVERS_DIR = this.configService.get('serversDir');
    this.COMPOSE_PROJECT = this.configService.get<string>('composeProject')?.trim() || undefined;
  }

  private validateServerId(serverId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(serverId);
  }

  private validateFilename(filename: string): boolean {
    return /^[a-zA-Z0-9._-]+\.tar\.gz$/.test(filename);
  }

  private getBackupsDir(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'backups');
  }

  private getMcDataPath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'mc-data');
  }

  private getDockerComposePath(serverId: string): string {
    return path.join(this.SERVERS_DIR, serverId, 'docker-compose.yml');
  }

  private getComposeExecOptions(serverId: string): ExecOptions {
    const composeDir = path.join(this.SERVERS_DIR, serverId);
    if (!this.COMPOSE_PROJECT) {
      return { cwd: composeDir };
    }
    return {
      cwd: composeDir,
      env: {
        ...process.env,
        COMPOSE_PROJECT_NAME: `${this.COMPOSE_PROJECT}_${serverId}`,
      },
    };
  }

  async listBackups(serverId: string): Promise<BackupFile[]> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }

    const backupsDir = this.getBackupsDir(serverId);
    if (!(await fs.pathExists(backupsDir))) {
      return [];
    }

    const files = await fs.readdir(backupsDir);
    const backupFiles = files.filter((f) => f.endsWith('.tar.gz'));

    const results = await Promise.all(
      backupFiles.map(async (filename) => {
        const filePath = path.join(backupsDir, filename);
        const stat = await fs.stat(filePath);
        return {
          filename,
          size: stat.size,
          createdAt: stat.birthtime,
        };
      }),
    );

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async triggerBackup(serverId: string): Promise<void> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }

    const containerName = `${serverId}-backup`;
    try {
      await execAsync(`docker exec ${containerName} backup now`);
      this.logger.log(`Backup triggered for server ${serverId}`);
    } catch (error) {
      this.logger.error(`Failed to trigger backup for ${serverId}`, error);
      throw new BadRequestException(`Failed to trigger backup: ${(error as Error).message}`);
    }
  }

  async restoreBackup(serverId: string, filename: string): Promise<void> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }
    if (!this.validateFilename(filename)) {
      throw new BadRequestException('Invalid filename');
    }

    const backupsDir = this.getBackupsDir(serverId);
    const backupFilePath = path.join(backupsDir, filename);

    if (!(await fs.pathExists(backupFilePath))) {
      throw new NotFoundException(`Backup file "${filename}" not found`);
    }

    const mcDataPath = this.getMcDataPath(serverId);
    const dockerComposePath = this.getDockerComposePath(serverId);
    const execOptions = this.getComposeExecOptions(serverId);

    // Step 1: Stop the MC server
    if (await fs.pathExists(dockerComposePath)) {
      this.logger.log(`Stopping server ${serverId} for restore...`);
      await execAsync('docker compose down', execOptions);
    }

    // Step 2: Clear mc-data contents
    this.logger.log(`Clearing mc-data for server ${serverId}...`);
    if (await fs.pathExists(mcDataPath)) {
      await fs.emptyDir(mcDataPath);
    } else {
      await fs.ensureDir(mcDataPath);
    }

    // Step 3: Extract backup into mc-data
    this.logger.log(`Extracting backup ${filename} for server ${serverId}...`);
    await execAsync(`tar -xzf "${backupFilePath}" -C "${mcDataPath}"`);

    // Step 4: Start the MC server
    this.logger.log(`Starting server ${serverId} after restore...`);
    await execAsync('docker compose up -d', execOptions);

    this.logger.log(`Restore complete for server ${serverId}`);
  }

  async getBackupFilePath(serverId: string, filename: string): Promise<string> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }
    if (!this.validateFilename(filename)) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = path.join(this.getBackupsDir(serverId), filename);
    if (!(await fs.pathExists(filePath))) {
      throw new NotFoundException(`Backup file "${filename}" not found`);
    }

    return filePath;
  }

  async deleteBackup(serverId: string, filename: string): Promise<void> {
    if (!this.validateServerId(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }
    if (!this.validateFilename(filename)) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = path.join(this.getBackupsDir(serverId), filename);
    if (!(await fs.pathExists(filePath))) {
      throw new NotFoundException(`Backup file "${filename}" not found`);
    }

    await fs.unlink(filePath);
    this.logger.log(`Deleted backup ${filename} for server ${serverId}`);
  }
}
