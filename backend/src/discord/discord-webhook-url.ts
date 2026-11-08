// One rule for every Discord webhook the panel accepts, so the instance-wide
// webhook and the per-server integrations cannot drift apart.
export const DISCORD_WEBHOOK_URL_PATTERN = /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]+$/;

export const DISCORD_WEBHOOK_INVALID_MESSAGE = 'url must be a Discord webhook URL';

export function isDiscordWebhookUrl(value: string): boolean {
  return DISCORD_WEBHOOK_URL_PATTERN.test(value.trim());
}
