import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { VelocityForwardingService } from './velocity-forwarding.service';

describe('VelocityForwardingService', () => {
  let serversDir: string;
  let service: VelocityForwardingService;
  let instanceSettings: { getVelocitySecrets: jest.Mock };

  const file = (id = 'lobby') => path.join(serversDir, id, 'mc-data', 'config', 'paper-global.yml');
  const read = (id = 'lobby') => yaml.load(fs.readFileSync(file(id), 'utf8')) as any;
  const paper = (overrides: Record<string, unknown> = {}) => ({ id: 'lobby', edition: 'JAVA', serverType: 'PAPER', velocityEnabled: true, ...overrides }) as any;

  beforeEach(async () => {
    serversDir = await fs.mkdtemp(path.join(os.tmpdir(), 'velocity-forwarding-'));
    await fs.ensureDir(path.join(serversDir, 'lobby', 'mc-data'));
    instanceSettings = { getVelocitySecrets: jest.fn().mockResolvedValue({ forwardingSecret: 'panel-secret', rconPassword: 'x' }) };
    service = new VelocityForwardingService({ get: jest.fn(() => serversDir) } as any, instanceSettings as any);
  });

  afterEach(() => fs.remove(serversDir));

  it('creates a minimal paper-global.yml for a member that has never booted', async () => {
    await service.apply(paper(), 'velocity');

    expect(read()).toEqual({ proxies: { velocity: { enabled: true, 'online-mode': true, secret: 'panel-secret' } } });
  });

  it('only touches proxies.velocity in an existing file', async () => {
    await fs.outputFile(file(), yaml.dump({ _version: 29, proxies: { 'bungee-cord': { 'online-mode': true }, velocity: { enabled: false, secret: '' } }, misc: { 'max-joins-per-tick': 5 } }));

    await service.apply(paper(), 'velocity');

    expect(read()).toEqual({
      _version: 29,
      proxies: { 'bungee-cord': { 'online-mode': true }, velocity: { enabled: true, 'online-mode': true, secret: 'panel-secret' } },
      misc: { 'max-joins-per-tick': 5 },
    });
  });

  it('leaves an up-to-date file alone', async () => {
    await fs.outputFile(file(), '# header\nproxies:\n  velocity:\n    enabled: true\n    online-mode: true\n    secret: panel-secret\n');

    await service.apply(paper(), 'velocity');

    expect(fs.readFileSync(file(), 'utf8')).toMatch(/^# header/);
  });

  it('turns forwarding off when the server leaves the network or the edge is not Velocity', async () => {
    await service.apply(paper(), 'velocity');
    await service.apply(paper({ velocityEnabled: false }), 'velocity');
    expect(read().proxies.velocity).toEqual({ enabled: false, 'online-mode': true });

    await service.apply(paper(), 'velocity');
    await service.apply(paper(), true);
    expect(read().proxies.velocity.enabled).toBe(false);
  });

  it('leaves forwarding set up by the operator for another proxy alone', async () => {
    await fs.outputFile(file(), yaml.dump({ proxies: { velocity: { enabled: true, 'online-mode': true, secret: 'their-secret' } } }));

    await service.apply(paper({ velocityEnabled: false }), 'velocity');

    expect(read().proxies.velocity.secret).toBe('their-secret');
  });

  it('does nothing for non-members without a file, other types or Bedrock', async () => {
    await service.apply(paper({ velocityEnabled: false }), 'velocity');
    await service.apply(paper({ serverType: 'FABRIC' }), 'velocity');
    await service.apply(paper({ edition: 'BEDROCK' }), 'velocity');
    await service.apply(paper({ velocityEnabled: false }), false);

    expect(fs.existsSync(file())).toBe(false);
    expect(instanceSettings.getVelocitySecrets).not.toHaveBeenCalled();
  });

  it('does not mint secrets for a non-member whose file never had forwarding on', async () => {
    await fs.outputFile(file(), yaml.dump({ proxies: { velocity: { enabled: false } } }));

    await service.apply(paper({ velocityEnabled: false }), 'velocity');

    expect(instanceSettings.getVelocitySecrets).not.toHaveBeenCalled();
  });

  it('refuses to follow a config link out of mc-data', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'velocity-outside-'));
    await fs.symlink(outside, path.join(serversDir, 'lobby', 'mc-data', 'config'));

    await expect(service.apply(paper(), 'velocity')).rejects.toThrow('Invalid path');
    expect(fs.existsSync(path.join(outside, 'paper-global.yml'))).toBe(false);
    await fs.remove(outside);
  });
});
