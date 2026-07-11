import type { Language } from '@/lib/translations';
import api from '../axios.service';

export interface ProxySettings {
  enabled: boolean;
  baseDomain: string | null;
  available: boolean;
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

export interface UserSettings {
  // Secrets are write-only: the API returns whether they are set, not the value.
  hasCfApiKey?: boolean;
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

export interface IntegrationSettings {
  smtp: SmtpIntegration;
  oidc: OidcIntegration;
}

export interface UpdateIntegrationSettings {
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
