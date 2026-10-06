import { deliveryFailureReason, RateLimitedError, withRateLimitRetry } from './delivery-errors';
import { Injectable, Logger } from '@nestjs/common';
import { AuthMailService } from 'src/auth/auth-mail.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { DiscordService, ServerEventType, SupportedLanguage } from 'src/discord/discord.service';
import { getRandomEvent } from 'src/discord/discord.translations';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Settings } from 'src/users/entities/settings.entity';
import { operationalMessages } from './operational-messages';

export type NotificationChannel = 'discord' | 'email' | 'telegram' | 'ntfy' | 'slack';
export interface DeliveryState { status: 'accepted' | 'failed' | 'unknown'; attemptedAt: string; source: 'automatic' | 'test'; reason?: string }
function truncateUtf8(text: string, maxBytes: number): string {
  let bytes = 0;
  let result = '';
  for (const character of text) {
    bytes += Buffer.byteLength(character);
    if (bytes > maxBytes) break;
    result += character;
  }
  return result;
}

type NotificationConfig = Awaited<ReturnType<InstanceSettingsService['getNotifications']>>;
type NotificationField = { name: string; value: string; inline?: boolean; discordOnly?: boolean };
type ServerDetails = { port?: string; ip?: string; lanIp?: string; players?: string; version?: string; modpack?: string; reason?: string };

@Injectable()
export class NotificationsService {
  private generation = 0;
  private sequence = 0;
  private readonly attempts: Partial<Record<NotificationChannel, number>> = {};
  private readonly outcomes: Partial<Record<NotificationChannel, DeliveryState>> = {};
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly settings: InstanceSettingsService,
    private readonly discord: DiscordService,
    @InjectRepository(Settings) private readonly userSettings: Repository<Settings>,
    private readonly mail: AuthMailService,
  ) { this.settings.registerResetHandler(() => this.resetDeliveryState()); }

  resetDeliveryState(channel?: NotificationChannel): void {
    this.generation++;
    if (channel) delete this.outcomes[channel];
    else for (const key of Object.keys(this.outcomes) as NotificationChannel[]) delete this.outcomes[key];
  }

  async isDiscordConfigured(): Promise<boolean> {
    try { return !!(await this.userSettings.findOne({ where: { discordWebhook: Not(IsNull()) }, order: { id: 'ASC' } }))?.discordWebhook; }
    catch { return false; }
  }

  getDeliveryState() { return { discord: this.outcomes.discord ?? null, email: this.outcomes.email ?? null, telegram: this.outcomes.telegram ?? null, ntfy: this.outcomes.ntfy ?? null, slack: this.outcomes.slack ?? null }; }

  private async recordAttempt(channel: NotificationChannel, source: 'automatic' | 'test', send: () => Promise<void>): Promise<void> {
    const attemptedAt = new Date().toISOString();
    const generation = this.generation;
    const attempt = ++this.sequence;
    this.attempts[channel] = attempt;
    try {
      await send();
      if (generation === this.generation && this.attempts[channel] === attempt) this.outcomes[channel] = { status: 'accepted', attemptedAt, source };
    } catch (error) {
      const reason = deliveryFailureReason(error);
      if (generation === this.generation && this.attempts[channel] === attempt) this.outcomes[channel] = { status: reason === 'Provider request failed' || reason === 'Request timed out' || ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION'].includes((error as { code?: string })?.code || '') ? 'unknown' : 'failed', attemptedAt, source, reason };
      throw error;
    }
  }

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

  async sendOperationalAlert(kind: 'disk' | 'backup' | 'recovery' | 'task' | 'game' | 'stale', subject: string, detail: string, incidentSeverity: 'warning' | 'error' = 'warning'): Promise<void> {
    const config = await this.settings.getNotifications();
    if (!config.alertsEnabled || !({ disk: config.diskAlertEnabled, backup: config.backupFailureEnabled, recovery: config.recoveryEnabled, task: config.taskFailureEnabled, game: config.gameAlertEnabled, stale: config.staleBackupEnabled }[kind])) return;
    const settings = await this.userSettings.findOne({ where: { discordWebhook: Not(IsNull()) }, order: { id: 'ASC' } });
    const t = operationalMessages((settings?.language as SupportedLanguage) || 'en');
    await this.sendCustomMessage(settings?.discordWebhook || '', t[kind], kind === 'recovery' ? t.recovered : t.description, kind === 'backup' || kind === 'task' ? 'error' : kind === 'recovery' ? incidentSeverity : 'warning', [
      { name: 'Minepanel', value: subject }, { name: 'Details', value: detail },
    ]);
  }

  async getAlertRules() {
    const config = await this.settings.getNotifications();
    return { enabled: config.alertsEnabled, taskFailureEnabled: config.taskFailureEnabled, gameAlertEnabled: config.gameAlertEnabled, gameFailureSamples: config.gameFailureSamples, gameStartupGraceMinutes: config.gameStartupGraceMinutes, cooldownMinutes: config.alertCooldownMinutes };
  }

  private async deliver(config: NotificationConfig, title: string, text: string, discord: () => Promise<void>, webhook: string): Promise<void> {
    const jobs: Array<{ channel: NotificationChannel; send: () => Promise<void> }> = [];
    if (config.discordEnabled && webhook) jobs.push({ channel: 'discord', send: discord });
    if (config.emailEnabled) jobs.push({ channel: 'email', send: () => this.sendEmail(config, title, text) });
    if (config.telegramEnabled) jobs.push({ channel: 'telegram', send: () => this.sendTelegram(config, title, text) });
    if (config.ntfyEnabled) jobs.push({ channel: 'ntfy', send: () => this.sendNtfy(config, title, text) });
    if (config.slackEnabled) jobs.push({ channel: 'slack', send: () => this.sendSlack(config, title, text) });
    const results = await Promise.allSettled(jobs.map((job) => this.recordAttempt(job.channel, 'automatic', job.send)));
    results.forEach((result, index) => {
      // Provider errors may contain credentials (Telegram embeds its token in the URL).
      if (result.status === 'rejected') this.logger.warn(`${jobs[index].channel} notification delivery failed`);
    });
  }

  async testChannel(channel: NotificationChannel): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.settings.getNotifications();
      const text = 'This is a test notification from Minepanel.';
      await this.recordAttempt(channel, 'test', async () => {
        if (channel === 'email') await this.sendEmail(config, 'Notification test', text);
        else if (channel === 'ntfy') await this.sendNtfy(config, 'Notification test', text);
        else if (channel === 'slack') await this.sendSlack(config, 'Notification test', text);
        else if (channel === 'telegram') await this.sendTelegram(config, 'Notification test', text);
        else {
          const row = await this.userSettings.findOne({ where: { discordWebhook: Not(IsNull()) }, order: { id: 'ASC' } });
          if (!row?.discordWebhook) throw new Error('Discord webhook is not configured');
          await this.discord.sendCustomMessage(row.discordWebhook, 'Notification test', text);
        }
      });
      return { success: true, message: 'Test notification sent' };
    } catch (error) {
      const reason = deliveryFailureReason(error);
      this.logger.warn(`${channel} notification test failed: ${reason}`);
      return { success: false, message: `Notification failed: ${reason}` };
    }
  }

  private async sendEmail(config: NotificationConfig, title: string, text: string): Promise<void> {
    if (!config.emailTo) throw new Error('Email notification is not configured');
    await this.mail.sendNotificationEmail(config.emailTo, title, text);
  }

  private async sendNtfy(config: NotificationConfig, title: string, text: string): Promise<void> {
    if (!config.ntfyTopic || config.ntfyTokenUnreadable) throw new Error('ntfy notification is not configured');
    await withRateLimitRetry(async (signal) => {
      const response = await fetch(`${config.ntfyServerUrl.replace(/\/+$/, '')}/`, {
        method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json', ...(config.ntfyToken ? { Authorization: `Bearer ${config.ntfyToken}` } : {}) },
        body: JSON.stringify({ topic: config.ntfyTopic, title: truncateUtf8(title, 200), message: truncateUtf8(text, 3000) }),
      });
      try {
        if (response.status === 429) throw new RateLimitedError(response.headers.get('retry-after'));
        if (!response.ok) throw new Error(`ntfy notification rejected (HTTP ${response.status})`);
      } finally { await response.body?.cancel(); }
    });
  }

  private async sendSlack(config: NotificationConfig, title: string, text: string): Promise<void> {
    if (!config.slackWebhook) throw new Error('Slack notification is not configured');
    await withRateLimitRetry(async (signal) => {
      const plain = Array.from(`${title}\n\n${text}`).slice(0, 3000).join('');
      const response = await fetch(config.slackWebhook, {
        method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plain.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), blocks: [{ type: 'section', text: { type: 'plain_text', text: plain, emoji: false } }], unfurl_links: false, unfurl_media: false }),
      });
      try {
        if (response.status === 429) throw new RateLimitedError(response.headers.get('retry-after'));
        if (!response.ok) throw new Error(`Slack notification rejected (HTTP ${response.status})`);
      } finally { await response.body?.cancel(); }
    });
  }

  private async sendTelegram(config: NotificationConfig, title: string, text: string): Promise<void> {
    if (!config.telegramToken || !config.telegramChatId) throw new Error('Telegram notification is not configured');
    await withRateLimitRetry(async (signal) => {
      const response = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.telegramChatId, text: Array.from(`${title}\n\n${text}`).slice(0, 4096).join(''), link_preview_options: { is_disabled: true } }),
        signal,
      });
      // An HTTP error status is a definite rejection even when a proxy answers with HTML.
      const result = await response.json().catch(() => (response.ok ? Promise.reject(new Error('Malformed Telegram response')) : {})) as { ok?: boolean; parameters?: { retry_after?: number } };
      if (response.status === 429) throw new RateLimitedError(result.parameters?.retry_after);
      if (!response.ok || result.ok !== true) throw new Error(`Telegram notification rejected (HTTP ${response.status || 200})`);
    });
  }
}
