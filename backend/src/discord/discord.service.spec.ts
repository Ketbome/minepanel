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
    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.embeds[0].fields).toEqual([
      { name: '🎮 survival', value: '```\nplay.example.com:25565\n```', inline: false },
      { name: '📦 Version', value: '`1.21`', inline: true },
      expect.objectContaining({ name: 'Status', value: expect.stringContaining('🟢') }),
    ]);
    expect(payload.embeds[0].color).toBe(0x22c55e);
    expect(req.end).toHaveBeenCalled();
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

  it('uses a neutral status for warnings and swallows webhook failures', async () => {
    const req = stubRequest(400, 'bad request');
    await expect(service.sendServerNotification('https://hooks.example/x', 'warning', 'srv')).resolves.toBeUndefined();
    expect(JSON.parse(req.write.mock.calls[0][0]).embeds[0].fields[1].value).toContain('🟡');
    expect(console.error).toHaveBeenCalledWith('Discord webhook error:', expect.stringContaining('400'));
  });

  it('posts custom messages and reports failures', async () => {
    const req = stubRequest(200);
    await service.sendCustomMessage('https://hooks.example/x', 'Title', 'Body', 'warning', [{ name: 'a', value: 'b' }]);
    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload.embeds[0]).toMatchObject({ title: 'Title', description: 'Body', color: 0xeab308, fields: [{ name: 'a', value: 'b' }], footer: { text: 'MinePanel' } });

    stubRequest(0, '', new Error('offline'));
    await service.sendCustomMessage('https://hooks.example/x', 'Title', 'Body');
    expect(console.error).toHaveBeenCalledWith('Discord custom message error:', 'offline');
  });

  it('testWebhook reports success and failure', async () => {
    stubRequest(204);
    expect(await service.testWebhook('https://hooks.example/x', 'nl')).toEqual({ success: true, message: expect.any(String) });

    stubRequest(0, '', new Error('offline'));
    expect(await service.testWebhook('https://hooks.example/x')).toEqual({ success: false, message: 'offline' });

    expect(await service.testWebhook('not a url')).toEqual({ success: false, message: expect.stringContaining('Invalid URL') });
  });
});
