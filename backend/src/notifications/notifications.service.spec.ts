import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AuthMailService } from 'src/auth/auth-mail.service';
import { NotificationsService } from './notifications.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { DiscordService } from 'src/discord/discord.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mail: AuthMailService;
  let config: Awaited<ReturnType<InstanceSettingsService['getNotifications']>>;
  let settings: { getNotifications: jest.Mock; getSmtp: jest.Mock; registerResetHandler: jest.Mock };
  let discord: { sendServerNotification: jest.Mock; sendCustomMessage: jest.Mock };
  let transporter: { sendMail: jest.Mock; close: jest.Mock };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    config = { ntfyEnabled: false, ntfyServerUrl: 'https://ntfy.sh', ntfyTopic: '', ntfyToken: '', ntfyTokenUnreadable: false, slackEnabled: false, slackWebhook: '', discordEnabled: true, emailEnabled: true, emailTo: 'admin@example.com', telegramEnabled: true, telegramToken: '123:secret', telegramChatId: '-100123', lifecycleEnabled: true, alertsEnabled: true, diskAlertEnabled: false, backupFailureEnabled: false, recoveryEnabled: false, taskFailureEnabled: false, gameAlertEnabled: false, staleBackupEnabled: false, gameFailureSamples: 3, gameStartupGraceMinutes: 5, staleBackupToleranceMinutes: 60, diskFreeThresholdPercent: 10, alertCooldownMinutes: 60 };
    settings = {
      getNotifications: jest.fn(async () => config),
      getSmtp: jest.fn().mockResolvedValue({ enabled: true, host: 'smtp.test', port: 587, secure: false, user: 'admin', pass: 'smtp-secret', from: 'panel@example.com' }),
      registerResetHandler: jest.fn(),
    };
    discord = { sendServerNotification: jest.fn().mockResolvedValue(undefined), sendCustomMessage: jest.fn().mockResolvedValue(undefined) };
    transporter = { sendMail: jest.fn().mockResolvedValue(undefined), close: jest.fn() };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(transporter);
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    mail = new AuthMailService(settings as never);
    service = new NotificationsService(settings as unknown as InstanceSettingsService, discord as unknown as DiscordService, { findOne: jest.fn().mockResolvedValue({ discordWebhook: 'https://hook', language: 'en' }) } as never, mail);
  });

  afterEach(() => jest.restoreAllMocks());

  it('fans out lifecycle events to all enabled channels', async () => {
    await service.sendServerNotification('https://hook', 'started', 'bedrock', 'en', { port: '19132', reason: 'Ready' });
    expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'started', 'bedrock', 'en', { port: '19132', reason: 'Ready' });
    expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@example.com', from: 'panel@example.com', text: expect.stringContaining('port: 19132') }));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bot123:secret/sendMessage');
    expect(JSON.parse(options.body)).toMatchObject({ chat_id: '-100123', text: expect.stringContaining('bedrock'), link_preview_options: { is_disabled: true } });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('delivers alerts without a Discord webhook and preserves server details', async () => {
    await service.sendCustomMessage('', 'Server down', 'Unexpected shutdown', 'error', [{ name: 'Server', value: 'srv' }]);
    expect(discord.sendCustomMessage).not.toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({ text: 'Unexpected shutdown\nServer: srv' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('delivers Discord alerts with the original embed fields', async () => {
    await service.sendCustomMessage('https://hook', 'CPU', 'High usage', 'warning', []);
    expect(discord.sendCustomMessage).toHaveBeenCalledWith('https://hook', 'CPU', 'High usage', 'warning', []);
  });

  it('honors channel switches', async () => {
    config.discordEnabled = config.emailEnabled = config.telegramEnabled = false;
    await service.sendServerNotification('https://hook', 'stopped', 'srv', 'en');
    expect(discord.sendServerNotification).not.toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honors event group switches', async () => {
    config.lifecycleEnabled = config.alertsEnabled = false;
    await service.sendServerNotification('https://hook', 'stopped', 'srv', 'en');
    await service.sendCustomMessage('https://hook', 'CPU', 'High', 'warning', []);
    expect(discord.sendServerNotification).not.toHaveBeenCalled();
    expect(discord.sendCustomMessage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('isolates provider failures and does not log secrets', async () => {
    transporter.sendMail.mockRejectedValue(new Error('smtp-secret'));
    fetchMock.mockRejectedValue(new Error('https://api.telegram.org/bot123:secret/sendMessage'));
    await expect(service.sendServerNotification('https://hook', 'error', 'srv', 'en')).resolves.toBeUndefined();
    expect(discord.sendServerNotification).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.warn).toHaveBeenCalledWith('email notification delivery failed');
    expect(Logger.prototype.warn).toHaveBeenCalledWith('telegram notification delivery failed');
    expect(JSON.stringify((Logger.prototype.warn as jest.Mock).mock.calls)).not.toContain('secret');
  });

  it('lets other channels deliver when Discord fails', async () => {
    discord.sendCustomMessage.mockRejectedValue(new Error('offline'));
    await service.sendCustomMessage('https://hook', 'Down', 'Down', 'error', []);
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tests saved destinations even when event groups and channels are disabled', async () => {
    config.emailEnabled = config.telegramEnabled = config.lifecycleEnabled = config.alertsEnabled = false;
    expect(await service.testChannel('email')).toEqual({ success: true, message: 'Test notification sent' });
    expect(await service.testChannel('telegram')).toEqual({ success: true, message: 'Test notification sent' });
  });

  it('reports missing email configuration without leaking provider errors', async () => {
    settings.getSmtp.mockResolvedValue({ enabled: false });
    expect((await service.testChannel('email')).success).toBe(false);
    settings.getSmtp.mockResolvedValue({ enabled: true });
    config.emailTo = '';
    expect((await service.testChannel('email')).success).toBe(false);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('reports missing Telegram credentials and destinations', async () => {
    config.telegramToken = '';
    expect((await service.testChannel('telegram')).success).toBe(false);
    config.telegramToken = '123:secret';
    config.telegramChatId = '';
    expect((await service.testChannel('telegram')).success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([{ ok: false, json: async () => ({ ok: false }) }, { ok: true, json: async () => ({ ok: false }) }, { ok: true, json: async () => { throw new Error('secret'); } }])('reports rejected and malformed Telegram responses', async (response) => {
    fetchMock.mockResolvedValue(response);
    const result = await service.testChannel('telegram');
    expect(result.success).toBe(false);
    expect(result.message).not.toContain('secret');
  });

  it('reports a non-JSON Telegram error page as a definite HTTP failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } });
    expect((await service.testChannel('telegram')).message).toBe('Notification failed: Telegram notification rejected (HTTP 502)');
    expect(service.getDeliveryState().telegram).toMatchObject({ status: 'failed' });
  });

  it('bounds Telegram messages without breaking Unicode characters', async () => {
    await service.sendCustomMessage('', 'Crash', '😀'.repeat(5000), 'error', []);
    const text = JSON.parse(fetchMock.mock.calls[0][1].body).text as string;
    expect(Array.from(text)).toHaveLength(4096);
    expect(text).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it('reuses SMTP transport and replaces it when integration settings change', async () => {
    await service.testChannel('email');
    await service.testChannel('email');
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    settings.registerResetHandler.mock.calls[0][0]();
    expect(transporter.close).toHaveBeenCalledTimes(1);
    await service.testChannel('email');
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
  });

  it('resets safely before a transport has been created', () => {
    expect(() => settings.registerResetHandler.mock.calls[0][0]()).not.toThrow();
  });

  it('honors operational switches and uses the saved Discord webhook', async () => {
    await service.sendOperationalAlert('disk', '/servers', '5% free');
    await service.sendOperationalAlert('backup', 'srv', 'Failed');
    await service.sendOperationalAlert('recovery', 'srv', 'cpu');
    expect(fetchMock).not.toHaveBeenCalled();
    config.diskAlertEnabled = config.backupFailureEnabled = config.recoveryEnabled = true;
    await service.sendOperationalAlert('disk', '/servers', '5% free');
    await service.sendOperationalAlert('backup', 'srv', 'Failed');
    await service.sendOperationalAlert('recovery', 'srv', 'cpu');
    expect(discord.sendCustomMessage).toHaveBeenCalledWith('https://hook', 'Low disk space', expect.any(String), 'warning', expect.any(Array));
    expect(discord.sendCustomMessage).toHaveBeenCalledWith('https://hook', 'Backup failed', expect.any(String), 'error', expect.any(Array));
    expect(discord.sendCustomMessage).toHaveBeenCalledWith('https://hook', 'Incident resolved', expect.any(String), 'warning', expect.any(Array));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preserves version and modpack metadata across all delivery channels', async () => {
    await service.sendServerNotification('https://hook', 'started', 'modded', 'en', { version: '1.20.1', modpack: 'ATM9' });
    expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'started', 'modded', 'en', { version: '1.20.1', modpack: 'ATM9' });
    expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('modpack: ATM9') }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toContain('version: 1.20.1');
  });
  it('keeps crash log tails exclusively in Discord and strips markup from plain text', async () => {
    await service.sendCustomMessage('https://hook', 'Crash', 'Failed', 'error', [
      { name: 'Server', value: '`srv`' },
      { name: 'Log tail', value: '```private-log-tail```', discordOnly: true },
    ]);
    expect(discord.sendCustomMessage).toHaveBeenCalledWith('https://hook', 'Crash', 'Failed', 'error', [
      { name: 'Server', value: '`srv`' }, { name: 'Log tail', value: '```private-log-tail```' },
    ]);
    const plain = transporter.sendMail.mock.calls[0][0].text;
    expect(plain).toContain('Server: srv');expect(plain).not.toContain('private-log-tail');expect(plain).not.toContain('`');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).not.toContain('private-log-tail');
  });

  it('logs safe diagnostic reasons for test failures without credentials', async () => {
    transporter.sendMail.mockRejectedValue(Object.assign(new Error('smtp-secret'), { code: 'EAUTH' }));
    expect((await service.testChannel('email')).message).toContain('EAUTH');
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ ok: false, description: '123:secret' }) });
    expect((await service.testChannel('telegram')).message).toContain('HTTP 401');
    fetchMock.mockRejectedValue(new Error('https://api.telegram.org/bot123:secret/sendMessage'));
    await service.testChannel('telegram');
    expect(JSON.stringify((Logger.prototype.warn as jest.Mock).mock.calls)).not.toContain('secret');
  });
  it('reuses the same SMTP transport for account mail and notifications', async () => {
    await mail.sendTestEmail('admin@example.com');
    await service.testChannel('email');
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(transporter.sendMail).toHaveBeenCalledTimes(2);
  });
  it('records accepted, failed and unknown channel outcomes without raw secrets', async () => {
    transporter.sendMail.mockRejectedValue(Object.assign(new Error('private'), { name: 'TimeoutError' }));
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ ok: false, description: 'private Telegram URL' }) });
    await service.sendCustomMessage('https://hook', 'Notice', 'Body', 'warning', []);
    expect(service.getDeliveryState().discord?.status).toBe('accepted');
    expect(service.getDeliveryState().email?.status).toBe('unknown');
    expect(service.getDeliveryState().telegram?.status).toBe('failed');
    expect(JSON.stringify(service.getDeliveryState())).not.toContain('private');
    service.resetDeliveryState();expect(service.getDeliveryState().discord).toBeNull();
  });

  it('ignores an old in-flight result after settings changed', async () => {
    let release: () => void;
    transporter.sendMail.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const pending = service.testChannel('email');
    await new Promise(resolve => setTimeout(resolve, 0));
    service.resetDeliveryState();release!();await pending;
    expect(service.getDeliveryState().email).toBeNull();
  });

  it('handles Telegram rate limits once without retrying timeouts', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ ok: false, parameters: { retry_after: 0 } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    expect((await service.testChannel('telegram')).success).toBe(true);expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('delivers to ntfy and Slack with private credentials and plain summaries', async () => {
    Object.assign(config, { ntfyEnabled: true, ntfyServerUrl: 'http://ntfy.internal/push/', ntfyTopic: 'private-alerts', ntfyToken: 'tk_secret', slackEnabled: true, slackWebhook: 'https://hooks.slack.com/services/T/B/secret' });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }), body: { cancel: jest.fn().mockResolvedValue(undefined) } });
    await service.sendCustomMessage('https://hook', 'Crash', '<!channel> & failed', 'error', [{ name: 'Log', value: 'sensitive-log', discordOnly: true }]);
    const ntfy = fetchMock.mock.calls.find(([url]) => url === 'http://ntfy.internal/push/');
    expect(ntfy?.[1]).toMatchObject({ redirect: 'error', headers: { Authorization: 'Bearer tk_secret' } });
    expect(JSON.parse(ntfy?.[1].body)).toEqual({ topic: 'private-alerts', title: 'Crash', message: '<!channel> & failed' });
    const slack = fetchMock.mock.calls.find(([url]) => url === config.slackWebhook);
    const payload = JSON.parse(slack?.[1].body);
    expect(slack?.[1].redirect).toBe('error');
    expect(payload.blocks[0].text).toMatchObject({ type: 'plain_text', text: 'Crash\n\n<!channel> & failed' });
    expect(payload.text).toContain('&lt;!channel&gt; &amp;');
    expect(JSON.stringify(payload)).not.toContain('sensitive-log');
    expect(service.getDeliveryState()).toMatchObject({ ntfy: { status: 'accepted' }, slack: { status: 'accepted' } });
  });

  it('supports anonymous ntfy and tests saved channels while disabled', async () => {
    config.ntfyTopic = 'minepanel'; config.slackWebhook = 'https://hooks.slack.com/services/T/B/secret';
    expect((await service.testChannel('ntfy')).success).toBe(true);
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect((await service.testChannel('slack')).success).toBe(true);
  });

  it('fails missing or unreadable new credentials before any request', async () => {
    expect((await service.testChannel('ntfy')).success).toBe(false);
    expect((await service.testChannel('slack')).success).toBe(false);
    config.ntfyTopic = 'private'; config.ntfyTokenUnreadable = true;
    expect((await service.testChannel('ntfy')).success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['ntfy', 'slack'] as const)('isolates %s rejection and sanitizes provider diagnostics', async (channel) => {
    Object.assign(config, { ntfyEnabled: true, ntfyTopic: 'private', slackEnabled: true, slackWebhook: 'https://hooks.slack.com/services/T/B/secret' });
    fetchMock.mockImplementation(async (url: string) => url.startsWith('https://api.telegram.org') ? { ok: true, json: async () => ({ ok: true }) } : { ok: false, status: 403 });
    expect((await service.testChannel(channel)).message).toContain('HTTP 403');
    expect(service.getDeliveryState()[channel]?.status).toBe('failed');
    fetchMock.mockRejectedValueOnce(new Error('private-token and secret-webhook'));
    expect((await service.testChannel(channel)).message).not.toContain('secret');
    await service.sendCustomMessage('https://hook', 'Alert', 'Body', 'warning', []);
    expect(discord.sendCustomMessage).toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalled();
    expect(service.getDeliveryState().telegram?.status).toBe('accepted');
    expect(JSON.stringify((Logger.prototype.warn as jest.Mock).mock.calls)).not.toContain('secret');
  });

  it.each(['ntfy', 'slack'] as const)('retries %s only on a bounded explicit rate limit', async (channel) => {
    config.ntfyTopic = 'private'; config.slackWebhook = 'https://hooks.slack.com/services/T/B/secret';
    const cancel = jest.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers({ 'retry-after': '0' }), body: { cancel } }).mockResolvedValueOnce({ ok: true, body: { cancel } });
    expect((await service.testChannel(channel)).success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(cancel).toHaveBeenCalledTimes(2);
    fetchMock.mockClear(); fetchMock.mockRejectedValue(Object.assign(new Error('token'), { name: 'TimeoutError' }));
    expect((await service.testChannel(channel)).success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(service.getDeliveryState()[channel]?.status).toBe('unknown');
  });

  it('bounds new provider messages while keeping Unicode intact', async () => {
    Object.assign(config, { telegramEnabled: false, ntfyEnabled: true, ntfyTopic: 'private', slackEnabled: true, slackWebhook: 'https://hooks.slack.com/services/T/B/secret' });
    await service.sendCustomMessage('', '😀'.repeat(300), '😀'.repeat(5000), 'error', []);
    const ntfy = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Buffer.byteLength(ntfy.message)).toBeLessThanOrEqual(3000);
    expect(ntfy.message).not.toMatch(/[\uD800-\uDBFF]$/);
    const slack = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(Array.from(slack.blocks[0].text.text)).toHaveLength(3000);
  });

});
