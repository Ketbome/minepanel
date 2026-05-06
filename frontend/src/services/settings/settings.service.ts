import api from '../axios.service';

type AppLanguage = 'en' | 'es' | 'nl' | 'de' | 'fr' | 'pl';

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
  cfApiKey?: string;
  discordWebhook?: string;
  language?: AppLanguage;
  proxy?: ProxySettings;
  network?: NetworkSettings;
  javaServerDefaults?: JavaServerDefaults | null;
  auditRetentionDays?: number;
}

export interface UpdateUserSettings {
  cfApiKey?: string;
  discordWebhook?: string;
  language?: AppLanguage;
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
