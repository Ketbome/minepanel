import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess, exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  IConsoleStrategy,
  CommandResult,
  LogsResult,
  ConsoleOptions,
} from '../interfaces/console-strategy.interface';

const execAsync = promisify(exec);

/**
 * Callback for receiving output from attached console
 */
export type OutputCallback = (data: string) => void;

/**
 * Active attach session
 */
export interface AttachSession {
  containerId: string;
  process: ChildProcess;
  onOutput: OutputCallback;
}

/**
 * Docker attach-based console strategy for Hytale servers
 * Uses stdin/stdout streams for bidirectional communication
 */
@Injectable()
export class AttachConsoleStrategy implements IConsoleStrategy {
  private readonly logger = new Logger(AttachConsoleStrategy.name);
  private activeSessions: Map<string, AttachSession> = new Map();

  /**
   * Send a command by writing to stdin of attached process
   * Note: For Hytale, commands are sent directly to stdin, no response expected
   */
  async sendCommand(
    containerId: string,
    command: string,
    _options?: ConsoleOptions,
  ): Promise<CommandResult> {
    try {
      const session = this.activeSessions.get(containerId);

      if (session?.process?.stdin?.writable) {
        // Write command to existing attached session
        session.process.stdin.write(command + '\n');
        return {
          success: true,
          output: 'Command sent to server console',
        };
      }

      // Fallback: use docker exec to write to stdin
      const { stdout, stderr } = await execAsync(
        `echo "${command}" | docker exec -i ${containerId} sh -c "cat > /proc/1/fd/0"`,
        { timeout: 5000 },
      );

      if (stderr) {
        return { success: false, output: '', error: stderr };
      }

      return {
        success: true,
        output: stdout || 'Command sent',
      };
    } catch (error) {
      this.logger.error(`Attach command failed for ${containerId}`, error);
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

  /**
   * Create a persistent attach session for WebSocket communication
   * Returns the session for external management
   */
  createAttachSession(
    containerId: string,
    onOutput: OutputCallback,
    onError: (error: Error) => void,
    onClose: () => void,
  ): AttachSession | null {
    try {
      // Kill existing session if any
      this.destroySession(containerId);

      const process = spawn('docker', ['attach', '--sig-proxy=false', containerId], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      process.stdout?.on('data', (data: Buffer) => {
        onOutput(data.toString());
      });

      process.stderr?.on('data', (data: Buffer) => {
        onOutput(data.toString());
      });

      process.on('error', (error) => {
        this.logger.error(`Attach process error for ${containerId}`, error);
        onError(error);
        this.activeSessions.delete(containerId);
      });

      process.on('close', (code) => {
        this.logger.log(`Attach session closed for ${containerId} with code ${code}`);
        onClose();
        this.activeSessions.delete(containerId);
      });

      const session: AttachSession = { containerId, process, onOutput };
      this.activeSessions.set(containerId, session);

      return session;
    } catch (error) {
      this.logger.error(`Failed to create attach session for ${containerId}`, error);
      return null;
    }
  }

  /**
   * Write input to an active session
   */
  writeToSession(containerId: string, input: string): boolean {
    const session = this.activeSessions.get(containerId);
    if (session?.process?.stdin?.writable) {
      session.process.stdin.write(input);
      return true;
    }
    return false;
  }

  /**
   * Destroy an active attach session
   */
  destroySession(containerId: string): void {
    const session = this.activeSessions.get(containerId);
    if (session) {
      session.process.kill();
      this.activeSessions.delete(containerId);
      this.logger.log(`Destroyed attach session for ${containerId}`);
    }
  }

  /**
   * Get all active session container IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
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
    const errorPatterns = [/ERROR/gi, /Exception/gi, /FATAL/gi];
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
