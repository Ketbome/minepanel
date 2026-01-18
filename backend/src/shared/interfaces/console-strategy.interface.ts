/**
 * Result of executing a command on a game server
 */
export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Server logs response structure
 */
export interface LogsResult {
  logs: string;
  hasErrors: boolean;
  lastUpdate: Date;
  metadata?: {
    totalLines: number;
    errorCount: number;
    warningCount: number;
  };
}

/**
 * Strategy interface for server console communication
 * Implements Strategy Pattern to support different communication methods:
 * - RCON for Minecraft servers
 * - Docker attach/stdin for Hytale servers
 */
export interface IConsoleStrategy {
  /**
   * Send a command to the server
   * @param containerId Docker container ID or name
   * @param command Command to execute
   * @param options Additional options (port, password for RCON)
   */
  sendCommand(
    containerId: string,
    command: string,
    options?: ConsoleOptions,
  ): Promise<CommandResult>;

  /**
   * Get server logs
   * @param containerId Docker container ID or name
   * @param lines Number of log lines to retrieve
   */
  getLogs(containerId: string, lines: number): Promise<LogsResult>;

  /**
   * Check if the console is available/connected
   * @param containerId Docker container ID or name
   */
  isAvailable(containerId: string): Promise<boolean>;
}

/**
 * Options for console operations
 */
export interface ConsoleOptions {
  rconPort?: string;
  rconPassword?: string;
  timeout?: number;
}

/**
 * Game type discriminator
 */
export type GameType = 'minecraft' | 'hytale';

/**
 * Base server configuration shared between game types
 */
export interface BaseServerConfig {
  id: string;
  serverName: string;
  port: string;
  gameType: GameType;
  restartPolicy: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  tz: string;
  envVars?: string;
  dockerLabels?: string;
}
