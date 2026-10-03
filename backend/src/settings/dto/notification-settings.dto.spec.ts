import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateIntegrationSettingsDto } from './update-integration-settings.dto';
import { TestNotificationDto } from 'src/users/controllers/integration-settings.controller';

const validateNotification = (notifications: unknown) => validate(plainToInstance(UpdateIntegrationSettingsDto, { notifications }), { whitelist: true, forbidNonWhitelisted: true });

describe('Notification settings validation', () => {
  it('accepts channel destinations, disabled switches and write-only clearing', async () => {
    expect(await validateNotification({ emailTo: 'admin@example.com', telegramToken: '123:token-abc', telegramChatId: '-100123', discordEnabled: false, emailEnabled: true, telegramEnabled: true, lifecycleEnabled: false, alertsEnabled: true, diskAlertEnabled: false, backupFailureEnabled: true, recoveryEnabled: true, diskFreeThresholdPercent: 10, alertCooldownMinutes: 60 })).toEqual([]);
    expect(await validateNotification({ emailTo: '', telegramToken: '', telegramChatId: '' })).toEqual([]);
    expect(await validateNotification({ telegramChatId: '@my_channel' })).toEqual([]);
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
  ])('rejects malformed values and unknown fields: %j', async (value) => {
    expect((await validateNotification(value)).length).toBeGreaterThan(0);
  });

  it('only accepts supported test channels', async () => {
    expect(await validate(plainToInstance(TestNotificationDto, { channel: 'email' }))).toEqual([]);
    expect(await validate(plainToInstance(TestNotificationDto, { channel: 'telegram' }))).toEqual([]);
    expect((await validate(plainToInstance(TestNotificationDto, { channel: 'webhook' }))).length).toBeGreaterThan(0);
  });
});
