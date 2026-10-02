import { Injectable, Logger } from '@nestjs/common';
import { AuthMailService } from 'src/auth/auth-mail.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { DiscordService, ServerEventType, SupportedLanguage } from 'src/discord/discord.service';
import { getRandomEvent } from 'src/discord/discord.translations';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Settings } from 'src/users/entities/settings.entity';
import { operationalMessages } from './operational-messages';

export type NotificationChannel = 'email' | 'telegram';
type NotificationConfig = Awaited<ReturnType<InstanceSettingsService['getNotifications']>>;
type NotificationField = { name: string; value: string; inline?: boolean; discordOnly?: boolean };
type ServerDetails = { port?: string; ip?: string; lanIp?: string; players?: string; version?: string; modpack?: string; reason?: string };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly settings: InstanceSettingsService,
    private readonly discord: DiscordService,
    @InjectRepository(Settings) private readonly userSettings: Repository<Settings>,
    private readonly mail: AuthMailService,
  ) {}

  async sendServerNotification(webhook: string, type: ServerEventType, serverName: string, lang: SupportedLanguage, details?: ServerDetails): Promise<void> {
    const config = await this.settings.getNotifications();
    if (!config.lifecycleEnabled) return;
    const event = getRandomEvent(lang, type);
    const text = [serverName, event.description, ...Object.entries(details ?? {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`)].join('\n');
    await this.deliver(config, event.title, text, () => this.discord.sendServerNotification(webhook, type, serverName, lang, details), webhook);
  }

  async sendCustomMessage(webhook: string, title: string, description: string, color: 'error' | 'warning' | 'success', fields: NotificationField[]): Promise<void> {
    const config = await this.settings.getNotifications();
    if (!config.alertsEnabled) return;
    const text = [description, ...fields.filter((field) => !field.discordOnly).map((field) => `${field.name}: ${field.value.replace(/`/g, '')}`)].join('\n');
    await this.deliver(config, title, text, () => this.discord.sendCustomMessage(webhook, title, description, color, fields.map(({ discordOnly: _discordOnly, ...field }) => field)), webhook);
  }

  async sendOperationalAlert(kind: 'disk' | 'backup' | 'recovery', subject: string, detail: string, incidentSeverity: 'warning' | 'error' = 'warning'): Promise<void> {
    const config = await this.settings.getNotifications();
    if (!config.alertsEnabled || !(kind === 'disk' ? config.diskAlertEnabled : kind === 'backup' ? config.backupFailureEnabled : config.recoveryEnabled)) return;
    const settings = await this.userSettings.findOne({ where: { discordWebhook: Not(IsNull()) }, order: { id: 'ASC' } });
    const t = operationalMessages((settings?.language as SupportedLanguage) || 'en');
    await this.sendCustomMessage(settings?.discordWebhook || '', t[kind], kind === 'recovery' ? t.recovered : t.description, kind === 'backup' ? 'error' : kind === 'disk' ? 'warning' : incidentSeverity, [
      { name: 'Minepanel', value: subject }, { name: 'Details', value: detail },
    ]);
  }

  private async deliver(config: NotificationConfig, title: string, text: string, discord: () => Promise<void>, webhook: string): Promise<void> {
    const jobs: Array<{ channel: string; send: () => Promise<void> }> = [];
    if (config.discordEnabled && webhook) jobs.push({ channel: 'Discord', send: discord });
    if (config.emailEnabled) jobs.push({ channel: 'Email', send: () => this.sendEmail(config, title, text) });
    if (config.telegramEnabled) jobs.push({ channel: 'Telegram', send: () => this.sendTelegram(config, title, text) });
    const results = await Promise.allSettled(jobs.map((job) => job.send()));
    results.forEach((result, index) => {
      // Provider errors may contain credentials (Telegram embeds its token in the URL).
      if (result.status === 'rejected') this.logger.warn(`${jobs[index].channel} notification delivery failed`);
    });
  }

  async testChannel(channel: NotificationChannel): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.settings.getNotifications();
      const text = 'This is a test notification from Minepanel.';
      if (channel === 'email') await this.sendEmail(config, 'Notification test', text);
      else await this.sendTelegram(config, 'Notification test', text);
      return { success: true, message: 'Test notification sent' };
    } catch (error) {
      const reason = this.failureReason(error);
      this.logger.warn(`${channel} notification test failed: ${reason}`);
      return { success: false, message: `Notification failed: ${reason}` };
    }
  }

  private async sendEmail(config: NotificationConfig, title: string, text: string): Promise<void> {
    if (!config.emailTo) throw new Error('Email notification is not configured');
    await this.mail.sendNotificationEmail(config.emailTo, title, text);
  }

  private failureReason(error: unknown): string {
    const message = error instanceof Error ? error.message : '';
    const known = ['Email notification is not configured', 'Email delivery is not configured', 'Telegram notification is not configured'];
    if (known.includes(message) || /^Telegram notification rejected \(HTTP \d{3}\)$/.test(message)) return message;
    const code = (error as { code?: string })?.code;
    if (code && ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'ENOTFOUND', 'EENVELOPE'].includes(code)) return `SMTP failure (${code})`;
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) return 'Request timed out';
    return 'Provider request failed';
  }

  private async sendTelegram(config: NotificationConfig, title: string, text: string): Promise<void> {
    if (!config.telegramToken || !config.telegramChatId) throw new Error('Telegram notification is not configured');
    const response = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.telegramChatId, text: Array.from(`${title}\n\n${text}`).slice(0, 4096).join(''), link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json() as { ok?: boolean };
    if (!response.ok || result.ok !== true) throw new Error(`Telegram notification rejected (HTTP ${response.status || 200})`);
  }
}
