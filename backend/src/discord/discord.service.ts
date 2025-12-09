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
  players?: string;
  version?: string;
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

    try {
      const event = getRandomEvent(lang, type);

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

      // Server info in a nice box
      let serverInfo = `\`\`\`\n${serverName}\n\`\`\``;
      if (details?.port) {
        serverInfo = `\`\`\`\n${serverName}  •  Port ${details.port}\n\`\`\``;
      }

      fields.push({ name: '🎮 Server', value: serverInfo, inline: false });

      // Version if available
      if (details?.version) {
        fields.push({ name: '📦 Version', value: `\`${details.version}\``, inline: true });
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
