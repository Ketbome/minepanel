import { Injectable } from '@nestjs/common';
import * as https from 'node:https';
import { ServerEventType, SupportedLanguage, getTranslation, getRandomTitle } from './discord.translations';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

interface ServerNotificationDetails {
  port?: string;
  players?: string;
  version?: string;
  reason?: string;
}

@Injectable()
export class DiscordService {
  private readonly COLORS = {
    success: 0x10b981,
    info: 0x3b82f6,
    warning: 0xf59e0b,
    error: 0xef4444,
    neutral: 0x6b7280,
  } as const;

  private readonly EMOJIS: Record<ServerEventType, string> = {
    created: '🎉',
    deleted: '🗑️',
    started: '🟢',
    stopped: '🔴',
    restarted: '🔄',
    error: '💥',
    warning: '⚠️',
  };

  private readonly STATUS_STYLES: Record<ServerEventType, 'positive' | 'negative' | 'neutral'> = {
    created: 'positive',
    deleted: 'negative',
    started: 'positive',
    stopped: 'negative',
    restarted: 'neutral',
    error: 'negative',
    warning: 'neutral',
  };

  private getColor(type: ServerEventType): number {
    const colorMap: Record<ServerEventType, number> = {
      created: this.COLORS.success,
      started: this.COLORS.success,
      stopped: this.COLORS.neutral,
      deleted: this.COLORS.neutral,
      restarted: this.COLORS.info,
      error: this.COLORS.error,
      warning: this.COLORS.warning,
    };
    return colorMap[type];
  }

  private formatStatusBar(status: string, style: 'positive' | 'negative' | 'neutral'): string {
    const formats = {
      positive: `\`\`\`diff\n+ ${status}\n\`\`\``,
      negative: `\`\`\`diff\n- ${status}\n\`\`\``,
      neutral: `\`\`\`fix\n~ ${status}\n\`\`\``,
    };
    return formats[style];
  }

  async sendServerNotification(webhookUrl: string, type: ServerEventType, serverName: string, lang: SupportedLanguage = 'en', details?: ServerNotificationDetails): Promise<void> {
    if (!webhookUrl) return;

    try {
      const t = getTranslation(lang);
      const event = t.events[type];
      const title = getRandomTitle(lang, type);

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [
        { name: t.fields.server, value: `\`${serverName}\``, inline: true },
        { name: t.fields.status, value: this.formatStatusBar(event.status, this.STATUS_STYLES[type]), inline: true },
      ];

      if (details?.port) {
        fields.push({ name: t.fields.port, value: `\`${details.port}\``, inline: true });
      }

      if (details?.version) {
        fields.push({ name: t.fields.version, value: `\`${details.version}\``, inline: true });
      }

      if (details?.reason) {
        fields.push({ name: t.fields.details, value: details.reason, inline: false });
      }

      const embed: DiscordEmbed = {
        title: `${this.EMOJIS[type]} ${title}`,
        color: this.getColor(type),
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'MinePanel' },
      };

      await this.postToWebhook(webhookUrl, { embeds: [embed] });
    } catch (error) {
      console.error('Discord webhook error:', error.message);
    }
  }

  async sendCustomMessage(webhookUrl: string, title: string, description: string, color: keyof typeof this.COLORS = 'info', fields?: Array<{ name: string; value: string; inline?: boolean }>): Promise<void> {
    if (!webhookUrl) return;

    try {
      const embed: DiscordEmbed = {
        title,
        description,
        color: this.COLORS[color],
        timestamp: new Date().toISOString(),
        footer: { text: 'MinePanel' },
        fields,
      };

      await this.postToWebhook(webhookUrl, { embeds: [embed] });
    } catch (error) {
      console.error('Discord custom message error:', error.message);
    }
  }

  async testWebhook(webhookUrl: string, lang: SupportedLanguage = 'es'): Promise<{ success: boolean; message: string }> {
    try {
      const t = getTranslation(lang);

      const embed: DiscordEmbed = {
        title: t.test.title,
        description: t.test.description,
        color: this.COLORS.success,
        fields: [{ name: t.fields.events, value: '`start` `stop` `restart` `create` `delete`', inline: false }],
        timestamp: new Date().toISOString(),
        footer: { text: 'MinePanel' },
      };

      await this.postToWebhook(webhookUrl, { embeds: [embed] });
      return { success: true, message: t.test.success };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private postToWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      const data = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Discord webhook returned status ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

export { ServerEventType, SupportedLanguage };
