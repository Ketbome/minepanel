import { Injectable } from '@nestjs/common';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as os from 'node:os';

const execAsync = promisify(exec);

export interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
  uptime: number;
  platform: string;
}

@Injectable()
export class SystemMonitoringService {
  private previousCpuInfo: { idle: number; total: number } | null = null;

  async getSystemStats(): Promise<SystemStats> {
    const cpuUsage = await this.getCpuUsage();
    const memoryStats = this.getMemoryStats();
    const diskStats = await this.getDiskStats();

    return {
      cpu: cpuUsage,
      memory: memoryStats,
      disk: diskStats,
      uptime: os.uptime(),
      platform: os.platform(),
    };
  }

  private async getCpuUsage(): Promise<{
    usage: number;
    cores: number;
    model: string;
  }> {
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cores = cpus.length;

    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;

    let usage = 0;
    if (this.previousCpuInfo) {
      const idleDiff = idle - this.previousCpuInfo.idle;
      const totalDiff = total - this.previousCpuInfo.total;
      usage = 100 - Math.trunc((100 * idleDiff) / totalDiff);
    }

    this.previousCpuInfo = { idle, total };

    return {
      usage: Math.max(0, Math.min(100, usage)),
      cores,
      model: cpuModel,
    };
  }

  private getMemoryStats(): {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usagePercentage: Math.round((usedMemory / totalMemory) * 100),
    };
  }

  private async getDiskStats(): Promise<{
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  }> {
    try {
      const platform = os.platform();
      let diskInfo: { total: number; used: number; free: number };

      if (platform === 'win32') {
        // Windows
        diskInfo = await this.getDiskStatsWindows();
      } else {
        // Linux/Unix/Mac
        diskInfo = await this.getDiskStatsUnix();
      }

      const usagePercentage = diskInfo.total > 0 ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0;

      return {
        ...diskInfo,
        usagePercentage,
      };
    } catch (error) {
      console.error('Error getting disk stats:', error);
      return {
        total: 0,
        used: 0,
        free: 0,
        usagePercentage: 0,
      };
    }
  }

  private async getDiskStatsUnix(): Promise<{
    total: number;
    used: number;
    free: number;
  }> {
    try {
      const { stdout } = await execAsync('df -k / | tail -1');
      const parts = stdout.trim().split(/\s+/);

      const total = Number.parseInt(parts[1]) * 1024;
      const used = Number.parseInt(parts[2]) * 1024;
      const free = Number.parseInt(parts[3]) * 1024;

      return { total, used, free };
    } catch (error) {
      console.error('Error getting Unix disk stats:', error);
      return { total: 0, used: 0, free: 0 };
    }
  }

  private async getDiskStatsWindows(): Promise<{
    total: number;
    used: number;
    free: number;
  }> {
    try {
      const { stdout } = await execAsync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /value');

      const lines = stdout.split('\n').filter((line) => line.includes('='));
      const stats: any = {};

      for (const line of lines) {
        const [key, value] = line.split('=');
        stats[key.trim()] = Number.parseInt(value.trim());
      }

      const total = stats.Size || 0;
      const free = stats.FreeSpace || 0;
      const used = total - free;

      return { total, used, free };
    } catch (error) {
      console.error('Error getting Windows disk stats:', error);
      return { total: 0, used: 0, free: 0 };
    }
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = Math.max(0, decimals);
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
