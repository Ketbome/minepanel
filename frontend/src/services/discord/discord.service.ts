import api from '../axios.service';

export const DISCORD_ACTIVITY_EVENTS = ['chat', 'command', 'join', 'leave', 'death', 'advancement', 'console'] as const;
export const DISCORD_OPERATIONAL_EVENTS = ['down', 'crash', 'cpu', 'memory', 'disk', 'backup', 'task', 'game', 'stale', 'recovery', 'lifecycle'] as const;

export type DiscordActivityEvent = (typeof DISCORD_ACTIVITY_EVENTS)[number];
export type DiscordOperationalEvent = (typeof DISCORD_OPERATIONAL_EVENTS)[number];
export type DiscordEventKey = DiscordActivityEvent | DiscordOperationalEvent;

export interface DiscordWebhookSummary {
  id: number;
  name: string;
  shared: boolean;
}

export interface DiscordIntegrationState {
  webhooks: DiscordWebhookSummary[];
  // Only explicitly saved routes. Missing keys keep their default.
  routes: Record<string, number | null>;
}

export interface CreateDiscordWebhookInput {
  name: string;
  url: string;
  shared: boolean;
}

export const getDiscordIntegration = async (serverId: string): Promise<DiscordIntegrationState> => {
  const response = await api.get(`/servers/${serverId}/discord`);
  return response.data;
};

export const createDiscordWebhook = async (serverId: string, input: CreateDiscordWebhookInput): Promise<DiscordWebhookSummary> => {
  const response = await api.post(`/servers/${serverId}/discord/webhooks`, input);
  return response.data;
};

export const deleteDiscordWebhook = async (serverId: string, id: number): Promise<void> => {
  await api.delete(`/servers/${serverId}/discord/webhooks/${id}`);
};

export const testDiscordWebhook = async (serverId: string, id: number): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/servers/${serverId}/discord/webhooks/${id}/test`);
  return response.data;
};

/** `null` turns an event off, `'instance'` restores the Minepanel-wide default. */
export const saveDiscordRoutes = async (serverId: string, routes: Record<string, number | null | 'instance'>): Promise<DiscordIntegrationState> => {
  const response = await api.put(`/servers/${serverId}/discord/routes`, { routes });
  return response.data;
};
