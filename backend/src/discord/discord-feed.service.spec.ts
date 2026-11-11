import { DiscordFeedService } from './discord-feed.service';

describe('DiscordFeedService', () => {
  let service: DiscordFeedService;
  let routing: { resolve: jest.Mock; serverName: jest.Mock; listFor: jest.Mock; channelMode: jest.Mock; sharedChannel: jest.Mock };
  let discord: { sendActivity: jest.Mock };

  beforeEach(() => {
    routing = {
      resolve: jest.fn(async (_serverId: string, key: string) => (key === 'chat' || key === 'console' || key === 'join' ? [{ url: 'https://hook', shared: false }] : [])),
      serverName: jest.fn(async () => 'Survival'),
      listFor: jest.fn(async () => ({ webhooks: [], routes: { chat: 1 } })),
      channelMode: jest.fn(async () => 'per-server'),
      sharedChannel: jest.fn(async () => null),
    };
    discord = { sendActivity: jest.fn().mockResolvedValue(undefined) };
    service = new DiscordFeedService(routing as never, discord as never);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('batches routed activity into one embed', async () => {
    service.publishActivity('srv', [
      { type: 'chat', name: 'Steve', message: 'hello' },
      { type: 'join', name: 'Alex', message: 'Alex joined the game' },
      { type: 'death', name: 'Herobrine', message: 'Herobrine was slain by Steve' },
    ]);

    await service.flush('srv');

    expect(discord.sendActivity).toHaveBeenCalledTimes(1);
    expect(discord.sendActivity).toHaveBeenCalledWith('https://hook', 'Survival', false, [
      '💬 Steve: hello',
      '➡️ Alex joined',
    ]);
  });

  it('does not deliver types that are not routed', async () => {
    service.publishActivity('srv', [
      { type: 'chat', name: 'Steve', message: 'hello' },
      { type: 'advancement', name: 'Steve', message: 'Steve made the advancement [Stone Age]' },
    ]);

    await service.flush('srv');

    expect(discord.sendActivity).toHaveBeenCalledWith('https://hook', 'Survival', false, ['💬 Steve: hello']);
  });

  it('sends nothing when the server routes no activity', async () => {
    routing.listFor.mockResolvedValue({ webhooks: [], routes: {} });
    service.publishActivity('srv', [{ type: 'chat', name: 'Steve', message: 'hello' }]);

    await service.flush('srv');

    expect(discord.sendActivity).not.toHaveBeenCalled();
  });

  it('splits a batch into messages of ten lines', async () => {
    const events = Array.from({ length: 12 }, (_, index) => ({ type: 'chat', name: 'Steve', message: `line ${index}` }));

    service.publishActivity('srv', events);
    await service.flush('srv');

    expect(discord.sendActivity).toHaveBeenCalledTimes(2);
    expect(discord.sendActivity.mock.calls[0][3]).toHaveLength(10);
    expect(discord.sendActivity.mock.calls[1][3]).toHaveLength(2);
  });

  it('sanitises console commands and keeps the failure marker', async () => {
    service.publishConsole('srv', 'admin', 'say `hi`\nnow', false);

    await service.flush('srv');

    expect(discord.sendActivity).toHaveBeenCalledWith('https://hook', 'Survival', false, ["🛠️ admin: say 'hi' now (failed)"]);
  });

  it('truncates very long player text', async () => {
    service.publishActivity('srv', [{ type: 'chat', name: 'Steve', message: 'x'.repeat(400) }]);

    await service.flush('srv');

    const line = discord.sendActivity.mock.calls[0][3][0] as string;
    expect(line.length).toBeLessThanOrEqual('💬 Steve: '.length + 200);
    expect(line.endsWith('…')).toBe(true);
  });

  it('marks shared targets so the sender can include the server name', async () => {
    routing.resolve.mockResolvedValue([{ url: 'https://shared', shared: true, serverName: 'Survival' }]);
    service.publishActivity('srv', [{ type: 'chat', name: 'Steve', message: 'hello' }]);

    await service.flush('srv');

    expect(discord.sendActivity).toHaveBeenCalledWith('https://shared', 'Survival', true, ['💬 Steve: hello']);
  });

  it('delivers unrouted activity to the shared channel in shared mode', async () => {
    routing.channelMode.mockResolvedValue('shared');
    routing.sharedChannel.mockResolvedValue({ url: 'https://shared', shared: true });
    routing.resolve.mockResolvedValue(null);
    routing.listFor.mockResolvedValue({ webhooks: [], routes: {} });
    service.publishActivity('srv', [{ type: 'chat', name: 'Steve', message: 'hello' }]);

    await service.flush('srv');

    expect(discord.sendActivity).toHaveBeenCalledWith('https://shared', 'Survival', true, ['💬 Steve: hello']);
  });

  it('does not deliver unrouted console entries to the shared channel', async () => {
    routing.channelMode.mockResolvedValue('shared');
    routing.sharedChannel.mockResolvedValue({ url: 'https://shared', shared: true });
    routing.resolve.mockResolvedValue(null);
    routing.listFor.mockResolvedValue({ webhooks: [], routes: {} });

    service.publishConsole('srv', 'admin', 'stop', true);
    await service.flush('srv');

    expect(discord.sendActivity).not.toHaveBeenCalled();
  });

  it('delivers console entries with an explicit route in shared mode', async () => {
    routing.channelMode.mockResolvedValue('shared');
    routing.sharedChannel.mockResolvedValue({ url: 'https://shared', shared: true });
    routing.resolve.mockResolvedValue([{ url: 'https://ops', shared: false }]);

    service.publishConsole('srv', 'admin', 'stop', true);
    await service.flush('srv');

    expect(discord.sendActivity).toHaveBeenCalledWith('https://ops', 'Survival', false, ['🛠️ admin: stop']);
  });

  it('still respects an explicit do-not-send in shared mode', async () => {
    routing.channelMode.mockResolvedValue('shared');
    routing.sharedChannel.mockResolvedValue({ url: 'https://shared', shared: true });
    routing.resolve.mockResolvedValue([]);
    routing.listFor.mockResolvedValue({ webhooks: [], routes: {} });
    service.publishActivity('srv', [{ type: 'chat', name: 'Steve', message: 'hello' }]);

    await service.flush('srv');

    expect(discord.sendActivity).not.toHaveBeenCalled();
  });

  it('drops the oldest entries once the queue is full', async () => {
    routing.resolve.mockResolvedValue([]);
    routing.listFor.mockResolvedValue({ webhooks: [], routes: {} });
    const events = Array.from({ length: 260 }, (_, index) => ({ type: 'chat', name: 'Steve', message: `line ${index}` }));

    service.publishActivity('srv', events);
    routing.resolve.mockResolvedValue([{ url: 'https://hook', shared: false }]);
    routing.listFor.mockResolvedValue({ webhooks: [], routes: { chat: 1 } });
    await service.flush('srv');

    const sent = discord.sendActivity.mock.calls.flatMap((call) => call[3]);
    expect(sent).toHaveLength(200);
    expect(sent[0]).toBe('💬 Steve: line 60');
  });

  it('resolves each event kind once per batch instead of once per line', async () => {
    const events = Array.from({ length: 25 }, (_, index) => ({ type: 'chat', name: 'Steve', message: `line ${index}` }));

    service.publishActivity('srv', events);
    await service.flush('srv');

    expect(routing.resolve).toHaveBeenCalledTimes(1);
    expect(discord.sendActivity).toHaveBeenCalledTimes(3);
  });

  it('ignores inherited object keys as event types', async () => {
    service.publishActivity('srv', [{ type: 'toString', name: 'Steve', message: 'x' }]);

    await service.flush('srv');

    expect(discord.sendActivity).not.toHaveBeenCalled();
  });

  it('ignores unknown event types', async () => {
    service.publishActivity('srv', [{ type: 'unknown', name: 'Steve', message: 'x' }]);

    await service.flush('srv');

    expect(discord.sendActivity).not.toHaveBeenCalled();
  });
});
