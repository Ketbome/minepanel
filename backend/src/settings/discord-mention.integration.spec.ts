import 'reflect-metadata';
import { EventEmitter } from 'node:events';
import * as https from 'node:https';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { InstanceSettingsService } from './instance-settings.service';
import { UpdateIntegrationSettingsDto } from './dto/update-integration-settings.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DiscordService } from 'src/discord/discord.service';
import { IntegrationSettingsController } from 'src/users/controllers/integration-settings.controller';
import { SettingsController } from 'src/users/controllers/settings.controller';

jest.mock('node:https', () => ({ request: jest.fn() }));

type Handler = (res: EventEmitter & { statusCode: number }) => void;

const WEBHOOK = 'https://discord.com/api/webhooks/123456789012345678/token';
const ROLE_ID = '123456789012345678';
const USER_ID = '234567890123456789';

// Captures the JSON body of the next webhook POST so the assertions run on exactly
// what Discord would receive.
const capture = (): (() => Record<string, any>) => {
  const req = Object.assign(new EventEmitter(), { write: jest.fn(), end: jest.fn() });
  (https.request as jest.Mock).mockImplementation((_options: unknown, handler: Handler) => {
    process.nextTick(() => {
      const res = Object.assign(new EventEmitter(), { statusCode: 204 });
      handler(res);
      res.emit('end');
    });
    return req;
  });
  return () => JSON.parse(req.write.mock.calls[0][0] as string);
};

const constraints = (errors: ValidationError[]): string[] => errors.flatMap((error) => [
  ...Object.values(error.constraints ?? {}),
  ...constraints(error.children ?? []),
]);

describe('Discord mention settings', () => {
  const originalSecret = process.env.JWT_SECRET;
  let instance: InstanceSettingsService;
  let notifications: NotificationsService;
  let discord: DiscordService;
  let settingsController: SettingsController;
  let integrationsController: IntegrationSettingsController;
  let row: any;

  beforeAll(() => {
    process.env.JWT_SECRET = 'discord-mention-integration-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    row = { id: 1 };

    const repo = {
      findOne: jest.fn(async () => row),
      save: jest.fn(async (value: unknown) => value),
      create: jest.fn((value: unknown) => value),
    };
    const userSettingsRepo = {
      findOne: jest.fn(async () => ({ id: 1, discordWebhook: WEBHOOK, language: 'en' })),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (value: unknown) => value),
    };

    // Real settings service over a repository double: the JSON round-trip under
    // test is the service's, not a mock's.
    instance = new InstanceSettingsService(repo as never, userSettingsRepo as never, { get: jest.fn() } as never);
    discord = new DiscordService();
    notifications = new NotificationsService(instance, discord, { resolve: jest.fn(async () => null) } as never, userSettingsRepo as never, {} as never);

    settingsController = new SettingsController(
      { getSettings: jest.fn(async () => ({ discordWebhook: WEBHOOK, language: 'en' })) } as never,
      discord,
      {} as never,
      {} as never,
      { record: jest.fn() } as never,
      instance,
      {} as never,
      {} as never,
      {} as never,
      notifications,
    );
    integrationsController = new IntegrationSettingsController(
      instance,
      { getRequestUser: jest.fn(async () => ({ id: 1, role: 'ADMIN' })) } as never,
      { assertIsAdmin: jest.fn() } as never,
      { record: jest.fn() } as never,
      {} as never,
      notifications,
    );
  });

  it('round-trips the three mention keys through the integrations save endpoint', async () => {
    const dto = plainToInstance(UpdateIntegrationSettingsDto, {
      notifications: { discordMentionType: 'role', discordMentionId: ROLE_ID, discordMentionOn: 'all' },
    });
    // The same whitelist the global ValidationPipe applies: an undeclared key here
    // would be a 400, which is how a silently dropped setting would show up.
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    expect(dto.notifications).toMatchObject({ discordMentionType: 'role', discordMentionId: ROLE_ID, discordMentionOn: 'all' });

    const saved = await integrationsController.updateIntegrations({ user: { userId: 1, username: 'admin' } } as never, dto);

    expect(row.notifications).toMatchObject({ discordMentionType: 'role', discordMentionId: ROLE_ID, discordMentionOn: 'all' });
    expect(saved.notifications).toMatchObject({ discordMentionType: 'role', discordMentionId: ROLE_ID, discordMentionOn: 'all' });
    expect(await instance.getNotifications()).toMatchObject({ discordMentionType: 'role', discordMentionId: ROLE_ID, discordMentionOn: 'all' });
  });

  it('keeps the saved mention across unrelated notification patches', async () => {
    await instance.updateIntegrations({ notifications: { discordMentionType: 'here', discordMentionOn: 'all' } });

    await instance.updateIntegrations({ notifications: { alertsEnabled: false } });

    expect(await instance.getNotifications()).toMatchObject({ discordMentionType: 'here', discordMentionOn: 'all' });
  });

  it('clears a stale ID when the mention type is not a role or user', async () => {
    await instance.updateIntegrations({ notifications: { discordMentionType: 'role', discordMentionId: ROLE_ID } });

    await instance.updateIntegrations({ notifications: { discordMentionType: 'none' } });

    expect(row.notifications).toMatchObject({ discordMentionType: 'none', discordMentionId: '' });
    expect((await instance.getNotifications()).discordMentionId).toBe('');
  });

  it('rejects a role mention with a malformed ID at save time with a clear error', async () => {
    const dto = plainToInstance(UpdateIntegrationSettingsDto, {
      notifications: { discordMentionType: 'role', discordMentionId: 'not-a-snowflake' },
    });
    const errors = constraints(await validate(dto, { whitelist: true, forbidNonWhitelisted: true }));
    expect(errors.join(' ')).toContain('discordMentionId');
    expect(errors.join(' ')).toContain('17 to 20 digit');

    // The service refuses it too, so an internal caller cannot store one either.
    await expect(instance.updateIntegrations({
      notifications: { discordMentionType: 'role', discordMentionId: 'not-a-snowflake' },
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves a legacy install to no mention and sends no content', async () => {
    row.notifications = { discordEnabled: true };

    expect(await instance.getNotifications()).toMatchObject({ discordMentionType: 'none', discordMentionId: '', discordMentionOn: 'errors' });

    const body = capture();
    await notifications.sendServerNotification(WEBHOOK, 'stopped', '@everyone', 'en');

    const payload = body();
    expect(payload).not.toHaveProperty('content');
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(JSON.stringify(payload.embeds)).toContain('@everyone');
  });

  it('pings the saved role only in scope, with the token alone in content', async () => {
    await instance.updateIntegrations({ notifications: { discordMentionType: 'role', discordMentionId: ROLE_ID, discordMentionOn: 'errors' } });

    const down = capture();
    await notifications.sendCustomMessage(WEBHOOK, '@here down', '@everyone server failed', 'error', [
      { name: 'Server', value: '@everyone' },
    ], 'down');

    const payload = down();
    expect(payload.content).toBe(`<@&${ROLE_ID}>`);
    expect(payload.content).not.toContain('everyone');
    expect(payload.allowed_mentions).toEqual({ parse: [], roles: [ROLE_ID] });

    const cpu = capture();
    await notifications.sendCustomMessage(WEBHOOK, 'CPU', 'High', 'warning', [], 'cpu');
    expect(cpu()).not.toHaveProperty('content');
  });

  it('sends the saved user mention from the legacy test-webhook endpoint', async () => {
    await instance.updateIntegrations({ notifications: { discordMentionType: 'user', discordMentionId: USER_ID } });

    const body = capture();
    await settingsController.testDiscordWebhook({ user: { userId: 1 } } as never);

    const payload = body();
    expect(payload.content).toBe(`<@${USER_ID}>`);
    expect(payload.allowed_mentions).toEqual({ parse: [], users: [USER_ID] });
    expect(payload.embeds[0].title).toEqual(expect.any(String));
  });

  it('sends no content from the legacy test-webhook endpoint with the default type', async () => {
    const body = capture();
    await settingsController.testDiscordWebhook({ user: { userId: 1 } } as never);

    const payload = body();
    expect(payload.content).toBeUndefined();
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });
});
