import { RateLimitedError, deliveryFailureReason, withRateLimitRetry } from 'src/notifications/delivery-errors';
import { Injectable } from '@nestjs/common';
import * as https from 'node:https';
import { ServerEventType, SupportedLanguage, getTranslation, getRandomEvent } from './discord.translations';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
  thumbnail?: { url: string };
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

interface ServerNotificationDetails {
  port?: string;
  ip?: string;
  lanIp?: string;
  players?: string;
  version?: string;
  modpack?: string;
  reason?: string;
}

@Injectable()
export class DiscordService {
  private readonly COLORS = {
    success: 0x22c55e,
    info: 0x3b82f6,
    warning: 0xeab308,
    error: 0xef4444,
    neutral: 0x6b7280,
    created: 0x8b5cf6,
    deleted: 0x64748b,
  } as const;

  private getColor(type: ServerEventType): number {
    const colorMap: Record<ServerEventType, number> = {
      created: this.COLORS.created,
      started: this.COLORS.success,
      stopped: this.COLORS.neutral,
      deleted: this.COLORS.deleted,
      restarted: this.COLORS.info,
      error: this.COLORS.error,
      warning: this.COLORS.warning,
    };
    return colorMap[type];
  }

  async sendServerNotification(webhookUrl: string, type: ServerEventType, serverName: string, lang: SupportedLanguage = 'en', details?: ServerNotificationDetails): Promise<void> {
    if (!webhookUrl) return;

    {
      const event = getRandomEvent(lang, type);

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

      // Server con IP:puerto copiable
      let connectionValue: string;
      if (details?.ip && details?.port) {
        connectionValue = `${details.ip}:${details.port}`;
      } else if (details?.ip) {
        connectionValue = details.ip;
      } else if (details?.lanIp && details?.port) {
        connectionValue = `${details.lanIp}:${details.port}`;
      } else if (details?.port) {
        connectionValue = `Port ${details.port}`;
      } else {
        connectionValue = serverName;
      }

      fields.push({ name: `🎮 ${serverName}`, value: `\`\`\`\n${connectionValue}\n\`\`\``, inline: false });

      // Version if available
      if (details?.version) {
        fields.push({ name: '📦 Version', value: `\`${details.version}\``, inline: true });
      }

      if (details?.modpack) {
        fields.push({ name: '🧩 Modpack', value: `\`${details.modpack}\``, inline: true });
      }

      // Status indicator
      const statusColors = {
        positive: '🟢',
        negative: '🔴',
        neutral: '🟡',
      };
      const statusType = ['started', 'created'].includes(type) ? 'positive' : ['stopped', 'deleted', 'error'].includes(type) ? 'negative' : 'neutral';
      fields.push({ name: 'Status', value: `${statusColors[statusType]} \`${event.status}\``, inline: true });

      // Error/warning details
      if (details?.reason) {
        fields.push({ name: '📋 Details', value: `\`\`\`${details.reason}\`\`\``, inline: false });
      }

      const embed: DiscordEmbed = {
        title: `${event.emoji} ${event.title}`,
        description: event.description,
        color: this.getColor(type),
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: event.footer },
      };

      await this.postToWebhook(webhookUrl, { embeds: [embed] });
    }
  }

  async sendCustomMessage(webhookUrl: string, title: string, description: string, color: keyof typeof this.COLORS = 'info', fields?: Array<{ name: string; value: string; inline?: boolean }>): Promise<void> {
    if (!webhookUrl) return;

    {
      const embed: DiscordEmbed = {
        title,
        description,
        color: this.COLORS[color],
        timestamp: new Date().toISOString(),
        footer: { text: 'MinePanel' },
        fields,
      };

      await this.postToWebhook(webhookUrl, { embeds: [embed] });
    }
  }

  async testWebhook(webhookUrl: string, lang: SupportedLanguage = 'en'): Promise<{ success: boolean; message: string }> {
    try {
      const t = getTranslation(lang);

      const featuresText = t.test.features.map((f) => `• ${f}`).join('\n');

      const embed: DiscordEmbed = {
        title: t.test.title,
        description: `${t.test.description}\n\n**Notifications:**\n${featuresText}`,
        color: this.COLORS.success,
        timestamp: new Date().toISOString(),
        footer: { text: '⛏️ MinePanel' },
      };

      await this.postToWebhook(webhookUrl, { embeds: [embed] });
      return { success: true, message: t.test.success };
    } catch (error) {
      return { success: false, message: deliveryFailureReason(error) };
    }
  }

  private postToWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<void> {
    return withRateLimitRetry((signal) => new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      url.searchParams.set('wait', 'true');
      const data = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        let retryBody = '';
        res.on('data', (chunk) => {
          if (res.statusCode === 429 && retryBody.length < 4096) retryBody += chunk.toString().slice(0, 4096 - retryBody.length);
        });

        res.on('error', reject);
        res.on('aborted', () => reject(Object.assign(new Error('Response aborted'), { name: 'AbortError' })));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else if (res.statusCode === 429) {
            let retryAfter: unknown = res.headers?.['retry-after'];
            if (retryAfter === undefined) { try { retryAfter = JSON.parse(retryBody).retry_after; } catch { /* Missing delay is not retried. */ } }
            reject(new RateLimitedError(retryAfter));
          } else {
            reject(new Error(`Discord webhook returned status ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    }));
  }
}

export { ServerEventType, SupportedLanguage };
