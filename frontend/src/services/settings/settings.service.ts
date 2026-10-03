import type { Language } from '@/lib/translations';
import api from '../axios.service';

// mc-router container settings. Minepanel generates and runs the router itself,
// so these replaced the MC_PROXY_* variables that used to live in .env.
export interface ProxyRouterSettings {
  proxyPort?: string;
  autoScaleEnabled?: boolean;
  autoScaleDownAfter?: string;
  autoScaleWakeTimeout?: string;
  autoScaleAsleepMotd?: string;
  autoScaleLoadingMotd?: string;
  extraNetworks?: string | null;
}

export type EdgeMode = 'mc-router' | 'velocity';

export interface ProxySettings {
  enabled: boolean;
  baseDomain: string | null;
  available: boolean;
  edgeMode?: EdgeMode;
  router?: ProxyRouterSettings;
}

export interface ProxyPowerResult {
  enabled: boolean;
  mode: EdgeMode;
  baseDomain: string | null;
  running: boolean;
}

// Acts immediately: the edge container is a thing you switch on, so it does
// not wait for the settings form to be saved.
export async function setProxyPower(enabled: boolean): Promise<ProxyPowerResult> {
  const response = await api.post<ProxyPowerResult>('/settings/proxy/power', { enabled });
  return response.data;
}

export interface NetworkSettings {
  publicIp: string | null;
  lanIp: string | null;
}

export interface JavaServerDefaults {
  onlineMode?: boolean;
  maxPlayers?: string;
  initMemory?: string;
  maxMemory?: string;
  cpuLimit?: string;
  cpuReservation?: string;
  memoryReservation?: string;
  difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
  gameMode?: 'survival' | 'creative' | 'adventure' | 'spectator';
  pvp?: boolean;
  allowFlight?: boolean;
  commandBlock?: boolean;
  viewDistance?: string;
  simulationDistance?: string;
  enableAutoStop?: boolean;
  autoStopTimeoutEst?: string;
  enableAutoPause?: boolean;
  autoPauseTimeoutEst?: string;
  enableBackup?: boolean;
}

export type CurseforgeKeyCheckCode = 'not_configured' | 'invalid_credentials' | 'rate_limited' | 'timeout' | 'unreachable' | 'unexpected';

export interface CurseforgeKeyCheck {
  ok: boolean;
  code?: CurseforgeKeyCheckCode;
}

export interface UserSettings {
  // Secrets are write-only: the API returns whether they are set, not the value.
  hasCfApiKey?: boolean;
  // Only present on a save that set a new CurseForge key.
  cfApiKeyCheck?: CurseforgeKeyCheck;
  hasDiscordWebhook?: boolean;
  language?: Language;
  proxy?: ProxySettings;
  network?: NetworkSettings;
  javaServerDefaults?: JavaServerDefaults | null;
  auditRetentionDays?: number;
}

export interface SmtpIntegration {
  host: string;
  port: number | null;
  secure: boolean;
  user: string;
  from: string;
  hasPassword: boolean;
  configured: boolean;
  source: 'db' | 'env' | 'unset';
}

export interface OidcIntegration {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  providerName: string;
  disablePasswordLogin: boolean;
  hasClientSecret: boolean;
  configured: boolean;
  source: 'db' | 'env' | 'unset';
}

export interface NotificationDelivery { status: 'accepted' | 'failed' | 'unknown'; attemptedAt: string; source: 'automatic' | 'test'; reason?: string }

export interface IntegrationSettings {
  systemDiscordConfigured?: boolean;
  notificationDelivery?: Record<'discord' | 'email' | 'telegram', NotificationDelivery | null>;
  smtp: SmtpIntegration;
  oidc: OidcIntegration;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  discordEnabled: boolean;
  emailEnabled: boolean;
  emailTo: string;
  telegramEnabled: boolean;
  telegramChatId: string;
  hasTelegramToken: boolean;
  lifecycleEnabled: boolean;
  alertsEnabled: boolean;
  diskAlertEnabled: boolean;
  backupFailureEnabled: boolean;
  recoveryEnabled: boolean;
  taskFailureEnabled: boolean;
  gameAlertEnabled: boolean;
  staleBackupEnabled: boolean;
  gameFailureSamples: number;
  gameStartupGraceMinutes: number;
  staleBackupToleranceMinutes: number;
  diskFreeThresholdPercent: number;
  alertCooldownMinutes: number;
}

export interface UpdateIntegrationSettings {
  notifications?: Partial<Omit<NotificationSettings, 'hasTelegramToken'>> & { telegramToken?: string };
  smtp?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    password?: string;
    from?: string;
  };
  oidc?: {
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scopes?: string;
    providerName?: string;
    disablePasswordLogin?: boolean;
  };
}

export interface UpdateUserSettings {
  cfApiKey?: string;
  discordWebhook?: string;
  language?: Language;
  proxy?: {
    proxyEnabled?: boolean;
    proxyBaseDomain?: string;
    edgeMode?: EdgeMode;
    router?: ProxyRouterSettings;
  };
  network?: {
    publicIp?: string;
    lanIp?: string;
  };
  javaServerDefaults?: JavaServerDefaults;
  auditRetentionDays?: number;
}

export const getSettings = async (): Promise<UserSettings> => {
  try {
    const response = await api.get('/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
};

/** Saves user settings; a new `cfApiKey` comes back with its `cfApiKeyCheck`. */
export const updateSettings = async (settings: UpdateUserSettings): Promise<UserSettings> => {
  try {
    const response = await api.patch('/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

export const testDiscordWebhook = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post('/settings/test-discord-webhook');
    return response.data;
  } catch (error) {
    console.error('Error testing Discord webhook:', error);
    throw error;
  }
};

/** Tests the typed CurseForge key when given, otherwise the saved one. Nothing is stored. */
export const testCurseforgeKey = async (cfApiKey?: string): Promise<CurseforgeKeyCheck> => {
  const response = await api.post<CurseforgeKeyCheck>('/settings/test-curseforge-key', cfApiKey ? { cfApiKey } : {});
  return response.data;
};

export const getIntegrationSettings = async (): Promise<IntegrationSettings> => {
  const response = await api.get('/settings/integrations');
  return response.data;
};

export const updateIntegrationSettings = async (settings: UpdateIntegrationSettings): Promise<IntegrationSettings> => {
  const response = await api.patch('/settings/integrations', settings);
  return response.data;
};

export const testSmtp = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/settings/integrations/smtp/test');
  return response.data;
};

export const testNotification = async (channel: 'discord' | 'email' | 'telegram'): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/settings/integrations/notifications/test', { channel });
  return response.data;
};
