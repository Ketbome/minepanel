import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DiscordRoutingService } from './discord-routing.service';
import { DiscordRoute } from './entities/discord-route.entity';
import { DiscordWebhook } from './entities/discord-webhook.entity';

const TOKEN = 'token-abc';
const WEBHOOK = `https://discord.com/api/webhooks/123456789012345678/${TOKEN}`;

describe('DiscordRoutingService', () => {
  let db: DataSource;
  let service: DiscordRoutingService;
  let webhooks: Repository<DiscordWebhook>;
  let routes: Repository<DiscordRoute>;
  const store = { readConfig: jest.fn(async (serverId: string) => (serverId === 'srv' ? { serverName: 'Survival' } : null)) };
  const settings = { getNotifications: jest.fn(async () => ({ discordChannelMode: 'per-server' })) };
  const userSettings = { findOne: jest.fn(async () => ({ discordWebhook: 'https://mipanel' })) };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    store.readConfig.mockClear();
    db = await new DataSource({ type: 'sqljs', entities: [DiscordWebhook, DiscordRoute], synchronize: true }).initialize();
    webhooks = db.getRepository(DiscordWebhook);
    routes = db.getRepository(DiscordRoute);
    service = new DiscordRoutingService(webhooks, routes, store as never, settings as never, userSettings as never);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('stores an encrypted url and never returns it', async () => {
    const hook = await service.create('srv', { name: 'Ops', url: WEBHOOK });
    const state = await service.listFor('srv');

    expect(hook).toEqual({ id: hook.id, name: 'Ops', shared: false });
    expect(state.webhooks).toEqual([{ id: hook.id, name: 'Ops', shared: false }]);
    expect(JSON.stringify(state)).not.toContain(TOKEN);
    const row = await webhooks.findOneByOrFail({ id: hook.id });
    expect(row.urlEnc).not.toContain(TOKEN);
  });

  it('keeps a shared webhook visible to every server', async () => {
    const shared = await service.create('srv', { name: 'Community', url: WEBHOOK, shared: true });

    expect(shared.shared).toBe(true);
    expect((await service.listFor('other')).webhooks).toEqual([{ id: shared.id, name: 'Community', shared: true }]);
  });

  it('leaves unrouted events to the delivery mode', async () => {
    await expect(service.resolve('srv', 'down')).resolves.toBeNull();
    await expect(service.resolve('srv', 'chat')).resolves.toBeNull();
  });

  it('reads the instance delivery mode and the shared channel', async () => {
    await expect(service.channelMode()).resolves.toBe('per-server');
    settings.getNotifications.mockResolvedValueOnce({ discordChannelMode: 'shared' } as never);
    await expect(service.channelMode()).resolves.toBe('shared');
    await expect(service.sharedChannel()).resolves.toEqual({ url: 'https://mipanel', shared: true });
    userSettings.findOne.mockResolvedValueOnce({ discordWebhook: '   ' } as never);
    await expect(service.sharedChannel()).resolves.toBeNull();
  });

  it('routes an event to its own webhook', async () => {
    const hook = await service.create('srv', { name: 'Chat', url: WEBHOOK });

    await service.setRoutes('srv', { chat: hook.id });

    await expect(service.resolve('srv', 'chat')).resolves.toEqual([{ url: WEBHOOK, shared: false, serverName: undefined }]);
    expect((await service.listFor('srv')).routes).toEqual({ chat: hook.id });
  });

  it('prefixes shared webhooks with the server name', async () => {
    const hook = await service.create('srv', { name: 'Community', url: WEBHOOK, shared: true });

    await service.setRoutes('srv', { down: hook.id });

    await expect(service.resolve('srv', 'down')).resolves.toEqual([{ url: WEBHOOK, shared: true, serverName: 'Survival' }]);
  });

  it('turns an event off and restores the instance default', async () => {
    const hook = await service.create('srv', { name: 'Ops', url: WEBHOOK });

    await service.setRoutes('srv', { down: null });
    await expect(service.resolve('srv', 'down')).resolves.toEqual([]);

    await service.setRoutes('srv', { down: hook.id });
    await service.setRoutes('srv', { down: 'instance' });
    await expect(service.resolve('srv', 'down')).resolves.toBeNull();
    expect((await service.listFor('srv')).routes).toEqual({});
  });

  it('saves nothing when one entry of the request is invalid', async () => {
    const hook = await service.create('srv', { name: 'Ops', url: WEBHOOK });

    await expect(service.setRoutes('srv', { chat: hook.id, nope: null })).rejects.toBeInstanceOf(BadRequestException);

    expect((await service.listFor('srv')).routes).toEqual({});
  });

  it('rejects unknown events and webhooks from another server', async () => {
    const foreign = await service.create('other', { name: 'Other', url: WEBHOOK });

    await expect(service.setRoutes('srv', { nope: null })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setRoutes('srv', { chat: foreign.id })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.webhookTarget('srv', foreign.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a webhook together with the routes that used it', async () => {
    const hook = await service.create('srv', { name: 'Ops', url: WEBHOOK });
    await service.setRoutes('srv', { down: hook.id, crash: hook.id });

    await service.remove('srv', hook.id);

    expect(await routes.count()).toBe(0);
    await expect(service.resolve('srv', 'down')).resolves.toBeNull();
  });

  it('removes only a deleted server’s routes and owned webhooks', async () => {
    const own = await service.create('srv', { name: 'Ops', url: WEBHOOK });
    const shared = await service.create('srv', { name: 'Community', url: WEBHOOK, shared: true });
    const other = await service.create('other', { name: 'Other', url: WEBHOOK });
    await service.setRoutes('srv', { chat: own.id, down: shared.id });
    await service.setRoutes('other', { chat: other.id });

    await service.removeForServer('srv');

    await expect(webhooks.findOneBy({ id: own.id })).resolves.toBeNull();
    await expect(webhooks.findOneBy({ id: shared.id })).resolves.not.toBeNull();
    await expect(webhooks.findOneBy({ id: other.id })).resolves.not.toBeNull();
    await expect(routes.findOneBy({ serverId: 'srv', eventKey: 'chat' })).resolves.toBeNull();
    await expect(routes.findOneBy({ serverId: 'srv', eventKey: 'down' })).resolves.toBeNull();
    await expect(routes.findOneBy({ serverId: 'other', eventKey: 'chat' })).resolves.not.toBeNull();
  });

  it('renames and re-points an own webhook but refuses a foreign one', async () => {
    const hook = await service.create('srv', { name: 'Old', url: WEBHOOK });
    const updated = await service.update('srv', hook.id, { name: 'New', url: `${WEBHOOK}-2` });

    expect(updated.name).toBe('New');
    const foreign = await service.create('other', { name: 'Other', url: WEBHOOK });
    await expect(service.update('srv', foreign.id, { name: 'Hijack' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cannot claim a shared webhook for one server', async () => {
    const shared = await service.create('srv', { name: 'Community', url: WEBHOOK, shared: true });

    const updated = await service.update('other', shared.id, { shared: false });

    expect(updated.shared).toBe(true);
    expect((await webhooks.findOneByOrFail({ id: shared.id })).serverId).toBeNull();
  });

  it('reflects a renamed server instead of caching the old name', async () => {
    await expect(service.serverName('srv')).resolves.toBe('Survival');
    store.readConfig.mockResolvedValueOnce({ serverName: 'Renamed' } as never);
    await expect(service.serverName('srv')).resolves.toBe('Renamed');
  });

  it('falls back to the server id when the name cannot be read', async () => {
    await expect(service.serverName('missing')).resolves.toBe('missing');
  });
});
