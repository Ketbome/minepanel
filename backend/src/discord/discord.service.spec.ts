import { EventEmitter } from 'node:events';
import * as https from 'node:https';
import { DiscordService } from './discord.service';

jest.mock('node:https', () => ({ request: jest.fn() }));

type Handler = (res: EventEmitter & { statusCode: number }) => void;

const stubRequest = (statusCode: number, body = '', networkError?: Error) => {
  const req = Object.assign(new EventEmitter(), { write: jest.fn(), end: jest.fn() });
  (https.request as jest.Mock).mockImplementation((_options, handler: Handler) => {
    process.nextTick(() => {
      if (networkError) {
        req.emit('error', networkError);
        return;
      }
      const res = Object.assign(new EventEmitter(), { statusCode });
      handler(res);
      if (body) res.emit('data', body);
      res.emit('end');
    });
    return req;
  });
  return req;
};

describe('DiscordService', () => {
  let service: DiscordService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    service = new DiscordService();
  });

  it('does nothing without a webhook url', async () => {
    await service.sendServerNotification('', 'started', 'srv');
    await service.sendCustomMessage('', 't', 'd');
    expect(https.request).not.toHaveBeenCalled();
  });

  it('posts a server notification embed with connection details', async () => {
    const req = stubRequest(204);

    await service.sendServerNotification('https://discord.com/api/webhooks/1/abc?wait=true', 'started', 'survival', 'es', { ip: 'play.example.com', port: '25565', version: '1.21' });

    const [options] = (https.request as jest.Mock).mock.calls[0];
    expect(options).toMatchObject({ hostname: 'discord.com', port: 443, path: '/api/webhooks/1/abc?wait=true', method: 'POST' });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.embeds[0].fields).toEqual([
      { name: '🎮 survival', value: '```\nplay.example.com:25565\n```', inline: false },
      { name: '📦 Version', value: '`1.21`', inline: true },
      expect.objectContaining({ name: 'Status', value: expect.stringContaining('🟢') }),
    ]);
    expect(payload.embeds[0].color).toBe(0x22c55e);
    expect(req.end).toHaveBeenCalled();
  });

  it('prefixes a shared-channel lifecycle title with the server name', async () => {
    const req = stubRequest(204);

    await service.sendServerNotification('https://hooks.example/x', 'started', 'Survival', 'en', undefined, undefined, 'Survival');

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.embeds[0].title).toMatch(/^Survival · /);
  });

  it('adds the modpack next to the version', async () => {
    const req = stubRequest(204);

    await service.sendServerNotification('https://hooks.example/x', 'started', 'srv', 'en', { version: '1.20.1', modpack: 'atm9' });

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.embeds[0].fields.slice(1, 3)).toEqual([
      { name: '📦 Version', value: '`1.20.1`', inline: true },
      { name: '🧩 Modpack', value: '`atm9`', inline: true },
    ]);
  });

  it('builds the connection value from whatever details are available', async () => {
    const cases: Array<[Record<string, string>, string]> = [
      [{ ip: 'host' }, 'host'],
      [{ lanIp: '10.0.0.2', port: '25566' }, '10.0.0.2:25566'],
      [{ port: '25567' }, 'Port 25567'],
      [{}, 'srv'],
    ];

    for (const [details, expected] of cases) {
      const req = stubRequest(200);
      await service.sendServerNotification('https://hooks.example/x', 'stopped', 'srv', 'en', { ...details, reason: 'crash' });
      const payload = JSON.parse(req.write.mock.calls[0][0]);
      expect(payload.embeds[0].fields[0].value).toBe(`\`\`\`\n${expected}\n\`\`\``);
      expect(payload.embeds[0].fields.at(-1)).toEqual({ name: '📋 Details', value: '```crash```', inline: false });
      expect(payload.embeds[0].fields.find((f: any) => f.name === 'Status').value).toContain('🔴');
    }
  });

  it('uses a neutral status and propagates failures to the dispatcher', async () => {
    const req = stubRequest(400, 'bad request');
    await expect(service.sendServerNotification('https://hooks.example/x', 'warning', 'srv')).rejects.toThrow('400');
    expect(JSON.parse(req.write.mock.calls[0][0]).embeds[0].fields[1].value).toContain('🟡');

  });

  it('posts custom messages and reports failures', async () => {
    const req = stubRequest(200);
    await service.sendCustomMessage('https://hooks.example/x', 'Title', 'Body', 'warning', [{ name: 'a', value: 'b' }]);
    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.embeds[0]).toMatchObject({ title: 'Title', description: 'Body', color: 0xeab308, fields: [{ name: 'a', value: 'b' }], footer: { text: 'MinePanel' } });

    stubRequest(0, '', new Error('offline'));
    await expect(service.sendCustomMessage('https://hooks.example/x', 'Title', 'Body')).rejects.toThrow('offline');
  });

  it('testWebhook reports success and failure', async () => {
    stubRequest(204);
    expect(await service.testWebhook('https://hooks.example/x', 'nl')).toEqual({ success: true, message: expect.any(String) });

    stubRequest(0, '', new Error('offline'));
    expect(await service.testWebhook('https://hooks.example/x')).toEqual({ success: false, message: 'Provider request failed' });

    expect(await service.testWebhook('not a url')).toEqual({ success: false, message: 'Provider request failed' });
  });
  it('forces message confirmation and retries a JSON 429 only once', async () => {
    let count = 0;
    (https.request as jest.Mock).mockImplementation((_options, handler: Handler) => {
      const req = Object.assign(new EventEmitter(), { write: jest.fn(), end: jest.fn() });
      process.nextTick(() => {
        const res = Object.assign(new EventEmitter(), { statusCode: ++count === 1 ? 429 : 200 });
        handler(res);res.emit('data', '{"retry_after":0}');res.emit('end');
      });
      return req;
    });
    await service.sendCustomMessage('https://hooks.example/x?wait=false', 'Title', 'Body');
    expect(https.request).toHaveBeenCalledTimes(2);
    expect((https.request as jest.Mock).mock.calls[0][0].path).toBe('/x?wait=true');
  });

  it('sends no content and allows no mentions by default', async () => {
    const req = stubRequest(204);

    await service.sendCustomMessage('https://discord.com/api/webhooks/1/abc', 'Title', 'Body');

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload).not.toHaveProperty('content');
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it('pings a configured role through an explicit allowlist only', async () => {
    const req = stubRequest(204);

    await service.sendCustomMessage('https://discord.com/api/webhooks/1/abc', 'Server down', 'Body', 'error', [], { type: 'role', id: '123456789012345678' });

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.content).toBe('<@&123456789012345678>');
    expect(payload.allowed_mentions).toEqual({ parse: [], roles: ['123456789012345678'] });
  });

  it('pings a user and falls back to no mention for a malformed id', async () => {
    const userRequest = stubRequest(204);
    await service.sendCustomMessage('https://discord.com/api/webhooks/1/abc', 'Title', 'Body', 'error', [], { type: 'user', id: '234567890123456789' });
    expect(JSON.parse(userRequest.write.mock.calls[0][0]).content).toBe('<@234567890123456789>');

    const malformed = stubRequest(204);
    await service.sendCustomMessage('https://discord.com/api/webhooks/1/abc', 'Title', 'Body', 'error', [], { type: 'role', id: '@everyone' });
    const payload = JSON.parse(malformed.write.mock.calls[0][0]);
    expect(payload).not.toHaveProperty('content');
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it('uses parse everyone only for @here and @everyone', async () => {
    for (const type of ['here', 'everyone'] as const) {
      const req = stubRequest(204);

      await service.sendServerNotification('https://discord.com/api/webhooks/1/abc', 'error', 'srv', 'en', undefined, { type });

      const payload = JSON.parse(req.write.mock.calls[0][0]);
      expect(payload.content).toBe(`@${type}`);
      expect(payload.allowed_mentions).toEqual({ parse: ['everyone'] });
    }
  });

  it('never lets a server name become a ping', async () => {
    const req = stubRequest(204);

    await service.sendServerNotification('https://discord.com/api/webhooks/1/abc', 'stopped', '@everyone @here <@&123456789012345678>', 'en', { reason: '@everyone' });

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload).not.toHaveProperty('content');
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    // The text still shows up where it cannot ping.
    expect(JSON.stringify(payload.embeds)).toContain('@everyone');
  });

  it('never lets custom message text become a ping', async () => {
    const req = stubRequest(204);

    await service.sendCustomMessage('https://discord.com/api/webhooks/1/abc', '@here outage', 'server @everyone is down', 'error', [
      { name: 'Server', value: '@everyone' },
    ]);

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload).not.toHaveProperty('content');
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    // The text is only ever rendered in the embed, where it cannot mention anyone.
    expect(JSON.stringify(payload.embeds)).toContain('@here');
    expect(JSON.stringify(payload.embeds)).toContain('@everyone');
  });

  it('puts only the configured token in content even beside hostile text', async () => {
    const req = stubRequest(204);

    await service.sendCustomMessage('https://discord.com/api/webhooks/1/abc', '@everyone', '@here @everyone', 'error', [
      { name: '@here', value: '@everyone' },
    ], { type: 'role', id: '111111111111111111' });

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.content).toBe('<@&111111111111111111>');
    expect(payload.content).not.toContain('everyone');
    expect(payload.allowed_mentions).toEqual({ parse: [], roles: ['111111111111111111'] });
  });

  it('carries the saved mention with a test message', async () => {
    const req = stubRequest(204);

    expect(await service.testWebhook('https://discord.com/api/webhooks/1/abc', 'en', { type: 'role', id: '345678901234567890' })).toEqual({ success: true, message: expect.any(String) });

    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.content).toBe('<@&345678901234567890>');
    expect(payload.allowed_mentions).toEqual({ parse: [], roles: ['345678901234567890'] });
  });
});
