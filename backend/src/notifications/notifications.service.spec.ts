import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NotificationsService } from './notifications.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { DiscordService } from 'src/discord/discord.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('NotificationsService', () => {
  let service: NotificationsService;
  let config: Awaited<ReturnType<InstanceSettingsService['getNotifications']>>;
  let settings: { getNotifications: jest.Mock; getSmtp: jest.Mock; registerResetHandler: jest.Mock };
  let discord: { sendServerNotification: jest.Mock; sendCustomMessage: jest.Mock };
  let transporter: { sendMail: jest.Mock; close: jest.Mock };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    config = { discordEnabled: true, emailEnabled: true, emailTo: 'admin@example.com', telegramEnabled: true, telegramToken: '123:secret', telegramChatId: '-100123', lifecycleEnabled: true, alertsEnabled: true, diskAlertEnabled: false, backupFailureEnabled: false, recoveryEnabled: false, diskFreeThresholdPercent: 10, alertCooldownMinutes: 60, minimumSeverity: 'info' };
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
    service = new NotificationsService(settings as unknown as InstanceSettingsService, discord as unknown as DiscordService, { findOne: jest.fn().mockResolvedValue({ discordWebhook: 'https://hook', language: 'en' }) } as never);
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
    expect(Logger.prototype.warn).toHaveBeenCalledWith('Email notification delivery failed');
    expect(Logger.prototype.warn).toHaveBeenCalledWith('Telegram notification delivery failed');
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
  it('filters automatic delivery by minimum severity while keeping tests available', async () => {
    config.minimumSeverity = 'error';
    await service.sendServerNotification('https://hook', 'started', 'srv', 'en');
    await service.sendCustomMessage('https://hook', 'CPU', 'High', 'warning', []);
    expect(fetchMock).not.toHaveBeenCalled();
    await service.sendCustomMessage('https://hook', 'Crash', 'Failed', 'error', []);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await service.testChannel('telegram')).success).toBe(true);
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
    expect(discord.sendCustomMessage).toHaveBeenCalledWith('https://hook', 'Incident resolved', expect.any(String), 'success', expect.any(Array));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('mutes informational recovery at warning severity', async () => {
    config.recoveryEnabled = true;config.minimumSeverity = 'warning';
    await service.sendOperationalAlert('recovery', 'srv', 'cpu');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('preserves version and modpack metadata across all delivery channels', async () => {
    await service.sendServerNotification('https://hook', 'started', 'modded', 'en', { version: '1.20.1', modpack: 'ATM9' });
    expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'started', 'modded', 'en', { version: '1.20.1', modpack: 'ATM9' });
    expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('modpack: ATM9') }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toContain('version: 1.20.1');
  });
});
