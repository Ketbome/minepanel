import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateIntegrationSettingsDto } from './update-integration-settings.dto';
import { TestNotificationDto } from 'src/users/controllers/integration-settings.controller';
import { UpdateSettingsDto } from 'src/users/dtos/settings.dto';

const validateNotification = (notifications: unknown) => validate(plainToInstance(UpdateIntegrationSettingsDto, { notifications }), { whitelist: true, forbidNonWhitelisted: true });

describe('Notification settings validation', () => {
  it('accepts channel destinations, disabled switches and write-only clearing', async () => {
    expect(await validateNotification({ emailTo: 'admin@example.com', telegramToken: '123:token-abc', telegramChatId: '-100123', discordEnabled: false, emailEnabled: true, telegramEnabled: true, lifecycleEnabled: false, alertsEnabled: true, diskAlertEnabled: false, backupFailureEnabled: true, recoveryEnabled: true, diskFreeThresholdPercent: 10, alertCooldownMinutes: 60 })).toEqual([]);
    expect(await validateNotification({ emailTo: '', telegramToken: '', telegramChatId: '' })).toEqual([]);
    expect(await validateNotification({ telegramChatId: '@my_channel' })).toEqual([]);
    expect(await validateNotification({ ntfyEnabled: true, ntfyServerUrl: 'http://localhost:8080/ntfy', ntfyTopic: 'minepanel-alerts', ntfyToken: 'tk_token', slackEnabled: true, slackWebhook: 'https://hooks.slack.com/services/T/B/key' })).toEqual([]);
    expect(await validateNotification({ ntfyToken: '', slackWebhook: '' })).toEqual([]);
    expect(await validateNotification({ discordMentionType: 'role', discordMentionId: '123456789012345678', discordMentionOn: 'errors' })).toEqual([]);
    expect(await validateNotification({ discordMentionType: 'none', discordMentionId: '', discordMentionOn: 'all' })).toEqual([]);
  });

  it.each([
    { emailTo: 'one@example.com,two@example.com' },
    { emailTo: 'admin@example.com\r\nBcc: other@example.com' },
    { telegramToken: '123:token/../../other' },
    { telegramChatId: 'not a chat' },
    { emailEnabled: 'true' },
    { telegramToken: '1:' + 'a'.repeat(300) },
    { hasTelegramToken: true },
    { lifecycleEnabled: 1 },
    { telegramToken: null },
    { emailEnabled: null },
    { diskFreeThresholdPercent: 51 },
    { alertCooldownMinutes: 0 },
    { minimumSeverity: 'critical' },
    { recoveryEnabled: null },
    { ntfyToken: 'token\r\nInjected: yes' },
    { ntfyTopic: '../admin' },
    { ntfyTopic: 'a/b' },
    { ntfyServerUrl: 'file:///etc/passwd' },
    { ntfyServerUrl: 'https://user:pass@host' },
    { ntfyServerUrl: 'https://host?token=private' },
    { ntfyServerUrl: 'https://host/#fragment' },
    { ntfyServerUrl: 'https://host\\evil' },
    { ntfyEnabled: null },
    { slackWebhook: 'http://hooks.slack.com/services/T/B/key' },
    { slackWebhook: 'https://hooks.slack.com.evil/services/T/B/key' },
    { slackWebhook: 'https://example.com/hook' },
    { slackWebhook: null },
    { hasSlackWebhook: true },
    { discordMentionType: 'channel' },
    { discordMentionOn: 'some' },
    { discordMentionType: 'role' },
    { discordMentionType: 'user', discordMentionId: 'abc' },
    { discordMentionId: '123' },
    { discordMentionType: null },
  ])('rejects malformed values and unknown fields: %j', async (value) => {
    expect((await validateNotification(value)).length).toBeGreaterThan(0);
  });

  it('only accepts Discord webhook URLs that can actually deliver', async () => {
    const validateWebhook = (discordWebhook: unknown) => validate(plainToInstance(UpdateSettingsDto, { discordWebhook }), { whitelist: true, forbidNonWhitelisted: true });

    expect(await validateWebhook('https://discord.com/api/webhooks/123456789012345678/abcDEF-_123')).toEqual([]);
    expect(await validateWebhook('https://discordapp.com/api/webhooks/123456789012345678/abcDEF-_123')).toEqual([]);
    expect(await validateWebhook('')).toEqual([]);

    for (const value of [
      'http://discord.com/api/webhooks/123456789012345678/abcDEF-_123',
      'https://discord.com.evil/api/webhooks/123456789012345678/abcDEF-_123',
      'https://example.com/api/webhooks/123456789012345678/abcDEF-_123',
      'https://discord.com/api/webhooks/1/abc',
      'https://user:pass@discord.com/api/webhooks/123456789012345678/abcDEF-_123',
      'https://discord.com/api/webhooks/123456789012345678/abcDEF-_123#fragment',
      'https://discord.com/api/webhooks/123456789012345678/abc/extra',
      'not a url',
    ]) {
      expect((await validateWebhook(value)).length).toBeGreaterThan(0);
    }
  });

  it('only accepts supported test channels', async () => {
    expect(await validate(plainToInstance(TestNotificationDto, { channel: 'email' }))).toEqual([]);
    expect(await validate(plainToInstance(TestNotificationDto, { channel: 'telegram' }))).toEqual([]);
    for (const channel of ['ntfy', 'slack']) expect(await validate(plainToInstance(TestNotificationDto, { channel }))).toEqual([]);
    expect((await validate(plainToInstance(TestNotificationDto, { channel: 'webhook' }))).length).toBeGreaterThan(0);
  });
});
