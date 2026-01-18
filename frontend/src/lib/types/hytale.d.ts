/**
 * Hytale server configuration
 */
export interface HytaleConfig {
  id: string;
  active: boolean;
  serverName: string;
  port: string;
  javaXms: string;
  javaXmx: string;
  useG1gc: boolean;
  viewDistance?: string;
  maxPlayers?: string;
  serverDescription?: string;
  dockerImage: string;
  restartPolicy: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  tz: string;
  envVars?: string;
  bindAddr: string;
  autoDownload: boolean;
}

/**
 * Simplified Hytale server list item
 */
export interface HytaleServerListItem {
  id: string;
  serverName: string;
  port: string;
  active: boolean;
}

/**
 * Hytale server status
 */
export type HytaleServerStatus = 'running' | 'stopped' | 'starting' | 'not_found' | 'loading';

/**
 * Hytale server info
 */
export interface HytaleServerInfo {
  exists: boolean;
  status: HytaleServerStatus;
  dockerComposeExists?: boolean;
  serverDataExists?: boolean;
  error?: string;
}

/**
 * Hytale logs response
 */
export interface HytaleLogsResponse {
  logs: string;
  hasErrors: boolean;
  lastUpdate: Date;
  status: HytaleServerStatus;
}

/**
 * Create Hytale server request
 */
export interface CreateHytaleServerDto {
  id: string;
  serverName?: string;
  port?: string;
}

/**
 * Update Hytale config request
 */
export interface UpdateHytaleConfigDto {
  serverName?: string;
  port?: string;
  javaXms?: string;
  javaXmx?: string;
  useG1gc?: boolean;
  viewDistance?: string;
  maxPlayers?: string;
  serverDescription?: string;
  dockerImage?: string;
  restartPolicy?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  tz?: string;
  envVars?: string;
  bindAddr?: string;
  autoDownload?: boolean;
}
