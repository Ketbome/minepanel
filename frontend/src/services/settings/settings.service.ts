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

export interface UserSettings {
  cfApiKey?: string;
  discordWebhook?: string;
  language?: 'en' | 'es';
  proxy?: ProxySettings;
  network?: NetworkSettings;
}

export interface UpdateUserSettings {
  cfApiKey?: string;
  discordWebhook?: string;
  language?: 'en' | 'es';
  proxy?: {
    proxyEnabled?: boolean;
    proxyBaseDomain?: string;
  };
  network?: {
    publicIp?: string;
    lanIp?: string;
  };
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
