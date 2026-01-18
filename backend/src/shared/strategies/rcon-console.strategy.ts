import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  IConsoleStrategy,
  CommandResult,
  LogsResult,
  ConsoleOptions,
} from '../interfaces/console-strategy.interface';

const execAsync = promisify(exec);

/**
 * RCON-based console strategy for Minecraft servers
 * Uses docker exec with rcon-cli to communicate with the server
 */
@Injectable()
export class RconConsoleStrategy implements IConsoleStrategy {
  private readonly logger = new Logger(RconConsoleStrategy.name);

  async sendCommand(
    containerId: string,
    command: string,
    options?: ConsoleOptions,
  ): Promise<CommandResult> {
    try {
      const port = options?.rconPort || '25575';
      const passwordArg = options?.rconPassword
        ? ` --password ${options.rconPassword}`
        : '';

      const dockerCommand = `docker exec -i ${containerId} rcon-cli --port ${port}${passwordArg} "${command}"`;
      const { stdout, stderr } = await execAsync(dockerCommand, {
        timeout: options?.timeout || 10000,
      });

      if (stderr) {
        this.logger.warn(`RCON stderr for ${containerId}: ${stderr}`);
        return { success: false, output: '', error: stderr };
      }

      return { success: true, output: stdout || 'Command executed successfully' };
    } catch (error) {
      this.logger.error(`RCON command failed for ${containerId}`, error);
      return { success: false, output: '', error: error.message };
    }
  }

  async getLogs(containerId: string, lines: number): Promise<LogsResult> {
    try {
      const { stdout } = await execAsync(
        `docker logs --tail ${lines} --timestamps ${containerId} 2>&1`,
      );

      const analysis = this.analyzeLogs(stdout);

      return {
        logs: stdout,
        hasErrors: analysis.errorCount > 0,
        lastUpdate: new Date(),
        metadata: analysis,
      };
    } catch (error) {
      this.logger.error(`Failed to get logs for ${containerId}`, error);
      return {
        logs: `Error: ${error.message}`,
        hasErrors: true,
        lastUpdate: new Date(),
      };
    }
  }

  async isAvailable(containerId: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker inspect --format="{{.State.Status}}" ${containerId}`,
      );
      return stdout.trim().toLowerCase() === 'running';
    } catch {
      return false;
    }
  }

  private analyzeLogs(logs: string): {
    totalLines: number;
    errorCount: number;
    warningCount: number;
  } {
    if (!logs) {
      return { totalLines: 0, errorCount: 0, warningCount: 0 };
    }

    const lines = logs.split('\n').filter((line) => line.trim());
    const errorPatterns = [
      /ERROR/gi,
      /SEVERE/gi,
      /FATAL/gi,
      /Exception/gi,
      /java\.lang\./gi,
    ];
    const warningPatterns = [/WARN/gi, /WARNING/gi];

    let errorCount = 0;
    let warningCount = 0;

    for (const line of lines) {
      if (errorPatterns.some((p) => p.test(line))) {
        errorCount++;
      } else if (warningPatterns.some((p) => p.test(line))) {
        warningCount++;
      }
    }

    return { totalLines: lines.length, errorCount, warningCount };
  }
}
