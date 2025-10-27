import { Injectable } from '@nestjs/common';
import * as https from 'node:https';

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
  username?: string;
  avatar_url?: string;
}

export type ServerEventType = 'created' | 'deleted' | 'started' | 'stopped' | 'restarted' | 'error' | 'warning';

@Injectable()
export class DiscordService {
  private readonly MINECRAFT_AVATAR = 'https://mc-heads.net/avatar/MHF_Steve/64.png';

  private readonly COLORS = {
    success: 0x10b981,
    info: 0x3b82f6,
    warning: 0xf59e0b,
    error: 0xef4444,
    neutral: 0x6b7280,
  };

  private getRandomMessage(type: ServerEventType, serverName: string, lang: 'en' | 'es' = 'es'): string {
    const messages = {
      es: {
        created: [`Servidor **${serverName}** creado y listo`, `Se armó el server **${serverName}**`, `Nuevo servidor: **${serverName}**`, `**${serverName}** está disponible`],
        deleted: [`Servidor **${serverName}** eliminado`, `Se borró **${serverName}**`, `**${serverName}** ya no existe`, `Bye **${serverName}**`],
        started: [`**${serverName}** está online`, `Server **${serverName}** arrancó`, `**${serverName}** prendido`, `Iniciado: **${serverName}**`],
        stopped: [`**${serverName}** offline`, `Server **${serverName}** apagado`, `**${serverName}** detenido`, `Se apagó **${serverName}**`],
        restarted: [`**${serverName}** reiniciado`, `Restart en **${serverName}**`, `**${serverName}** se reinició`, `Reiniciando **${serverName}**...`],
        error: [`Uy, error en **${serverName}**`, `Algo falló con **${serverName}**`, `**${serverName}** tiene un problema`, `Houston tenemos un problema con **${serverName}**`],
        warning: [`Ojo con **${serverName}**`, `Cuidado: **${serverName}**`, `**${serverName}** necesita atención`, `Alerta en **${serverName}**`],
      },
      en: {
        created: [`Server **${serverName}** created and ready`, `New server: **${serverName}**`, `**${serverName}** is available`, `Built **${serverName}**`],
        deleted: [`Server **${serverName}** deleted`, `Removed **${serverName}**`, `**${serverName}** is gone`, `Bye **${serverName}**`],
        started: [`**${serverName}** is online`, `Server **${serverName}** is up`, `**${serverName}** started`, `Started: **${serverName}**`],
        stopped: [`**${serverName}** offline`, `Server **${serverName}** is down`, `**${serverName}** stopped`, `Stopped **${serverName}**`],
        restarted: [`**${serverName}** restarted`, `Restarting **${serverName}**`, `**${serverName}** rebooted`, `Reboot: **${serverName}**...`],
        error: [`Oops, error on **${serverName}**`, `Something failed with **${serverName}**`, `**${serverName}** has issues`, `Houston we have a problem with **${serverName}**`],
        warning: [`Watch out for **${serverName}**`, `Careful: **${serverName}**`, `**${serverName}** needs attention`, `Alert on **${serverName}**`],
      },
    };

    const messageList = messages[lang][type];
    return messageList[Math.floor(Math.random() * messageList.length)];
  }

  private getEmoji(type: ServerEventType): string {
    const emojis = {
      created: '🎉',
      deleted: '🗑️',
      started: '🟢',
      stopped: '🔴',
      restarted: '🔄',
      error: '💥',
      warning: '⚠️',
    };
    return emojis[type];
  }

  private getColor(type: ServerEventType): number {
    switch (type) {
      case 'created':
      case 'started':
        return this.COLORS.success;
      case 'stopped':
      case 'deleted':
        return this.COLORS.neutral;
      case 'restarted':
        return this.COLORS.info;
      case 'error':
        return this.COLORS.error;
      case 'warning':
        return this.COLORS.warning;
      default:
        return this.COLORS.neutral;
    }
  }

  async sendServerNotification(webhookUrl: string, type: ServerEventType, serverName: string, lang: 'en' | 'es' = 'es', details?: { port?: string; players?: string; version?: string; reason?: string }): Promise<void> {
    if (!webhookUrl) return;

    try {
      const titles = {
        es: { created: 'Servidor Creado', deleted: 'Servidor Eliminado', started: 'Servidor Iniciado', stopped: 'Servidor Detenido', restarted: 'Servidor Reiniciado', error: 'Error', warning: 'Advertencia' },
        en: { created: 'Server Created', deleted: 'Server Deleted', started: 'Server Started', stopped: 'Server Stopped', restarted: 'Server Restarted', error: 'Error', warning: 'Warning' },
      };

      const message = this.getRandomMessage(type, serverName, lang);
      const embed: DiscordEmbed = {
        title: `${this.getEmoji(type)} ${titles[lang][type]}`,
        description: message,
        color: this.getColor(type),
        timestamp: new Date().toISOString(),
        footer: { text: 'Minepanel • Server Management' },
      };

      if (details?.reason) {
        embed.fields = [{ name: lang === 'es' ? '💬 Razón' : '💬 Reason', value: details.reason, inline: false }];
      }

      await this.postToWebhook(webhookUrl, { username: 'Minepanel', avatar_url: this.MINECRAFT_AVATAR, embeds: [embed] });
    } catch (error) {
      console.error('Discord webhook error:', error.message);
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

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  async sendCustomMessage(webhookUrl: string, title: string, description: string, color: 'success' | 'info' | 'warning' | 'error' = 'info', fields?: Array<{ name: string; value: string; inline?: boolean }>): Promise<void> {
    if (!webhookUrl) return;

    try {
      const embed: DiscordEmbed = {
        title,
        description,
        color: this.COLORS[color],
        timestamp: new Date().toISOString(),
        footer: { text: 'Minepanel • Server Management' },
        fields,
      };

      await this.postToWebhook(webhookUrl, { username: 'Minepanel', avatar_url: this.MINECRAFT_AVATAR, embeds: [embed] });
    } catch (error) {
      console.error('Discord custom message error:', error.message);
    }
  }

  async testWebhook(webhookUrl: string, lang: 'en' | 'es' = 'es'): Promise<{ success: boolean; message: string }> {
    try {
      const messages = {
        es: { title: '🎯 Webhook Test', desc: 'Si ves esto, todo está funcionando correctamente. Las notificaciones están activas.', success: 'Prueba exitosa' },
        en: { title: '🎯 Webhook Test', desc: "If you're seeing this, everything is working correctly. Notifications are active.", success: 'Test successful' },
      };

      await this.sendCustomMessage(webhookUrl, messages[lang].title, messages[lang].desc, 'success');
      return { success: true, message: messages[lang].success };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
