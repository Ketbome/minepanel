jest.mock('../common/crypto/secret-cipher', () => ({
  encryptSecret: jest.fn((value: string) => `enc:${value}`),
  decryptSecret: jest.fn((value: string) => value.replace(/^enc:/, '')),
}));

jest.mock('fs-extra', () => {
  const actual = jest.requireActual('fs-extra');
  return { ...actual, readFile: jest.fn((...args: unknown[]) => actual.readFile(...args)) };
});

import * as fs from 'fs-extra';
import { decryptSecret } from '../common/crypto/secret-cipher';
import { InstanceSettingsService } from './instance-settings.service';

describe('InstanceSettingsService router, defaults and OIDC', () => {
  let row: any;
  let repo: Record<string, jest.Mock>;
  let userSettingsRepo: Record<string, jest.Mock>;
  let config: { get: jest.Mock };
  let service: InstanceSettingsService;

  beforeEach(() => {
    row = { id: 1, preferencesMigrated: true };
    repo = {
      findOne: jest.fn(async () => row),
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => entity),
    };
    userSettingsRepo = { find: jest.fn().mockResolvedValue([]), save: jest.fn() };
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new InstanceSettingsService(repo as any, userSettingsRepo as any, config as any);
  });

  it('creates the singleton row on first access', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    expect(await service.getNetwork()).toEqual({ publicIp: null, lanIp: null });
    expect(repo.create).toHaveBeenCalledWith({ id: 1 });
  });

  describe('edge mode', () => {
    it('keeps mc-router as the edge for rows saved before Velocity existed', async () => {
      row.proxyEnabled = true;
      row.proxyBaseDomain = 'mc.example.com';
      expect(await service.getEdge()).toEqual({ enabled: true, mode: 'mc-router', baseDomain: 'mc.example.com' });
      expect(await service.getProxy()).toEqual({ enabled: true, baseDomain: 'mc.example.com' });
    });

    // Server compose files and routes.json only react to mc-router routing.
    it('turns mc-router routing off while Velocity is the edge', async () => {
      row.proxyEnabled = true;
      row.proxyBaseDomain = 'mc.example.com';
      row.edgeMode = 'velocity';
      expect(await service.getEdge()).toEqual({ enabled: true, mode: 'velocity', baseDomain: 'mc.example.com' });
      expect(await service.getProxy()).toEqual({ enabled: false, baseDomain: 'mc.example.com' });
    });

    it('lets Velocity run without a base domain, but not mc-router', async () => {
      expect(await service.setProxy({ enabled: true, edgeMode: 'velocity' })).toEqual({ enabled: true, mode: 'velocity', baseDomain: null });
      expect(await service.setProxy({ edgeMode: 'mc-router' })).toEqual({ enabled: false, mode: 'mc-router', baseDomain: null });
      expect(row.proxyEnabled).toBe(false);
    });

    it('tells compose generation which edge to build against', async () => {
      expect(await service.getComposeEdge()).toBe(false);
      row.proxyEnabled = true;
      row.proxyBaseDomain = 'mc.example.com';
      expect(await service.getComposeEdge()).toBe(true);
      row.edgeMode = 'velocity';
      expect(await service.getComposeEdge()).toBe('velocity');
    });

    it('mints the Velocity secrets once and keeps them', async () => {
      const first = await service.getVelocitySecrets();
      expect(first.forwardingSecret).toMatch(/^[\w-]{32}$/);
      expect(first.rconPassword).not.toBe(first.forwardingSecret);
      expect(row.velocitySecretEnc).toBe(`enc:${first.forwardingSecret}`);
      expect(await service.getVelocitySecrets()).toEqual(first);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('keeps the forwarding secret from disk when the stored copies no longer decrypt', async () => {
      row.velocitySecretEnc = 'enc:old-secret';
      row.velocityRconEnc = 'enc:old-rcon';
      const decrypt = decryptSecret as jest.Mock;
      decrypt.mockImplementationOnce(() => {
        throw new Error('Unsupported state or unable to authenticate data');
      });
      const readFile = fs.readFile as unknown as jest.Mock;
      readFile.mockResolvedValueOnce('old-secret\n');

      const secrets = await service.getVelocitySecrets();

      expect(readFile).toHaveBeenCalledWith('/app/data/velocity/server/forwarding.secret', 'utf8');
      expect(secrets.forwardingSecret).toBe('old-secret');
      expect(secrets.rconPassword).not.toBe('old-rcon');
      expect(row.velocitySecretEnc).toBe('enc:old-secret');

      // Without the file there is nothing to keep, so both are minted again.
      row.velocitySecretEnc = 'enc:old-secret';
      decrypt.mockImplementationOnce(() => {
        throw new Error('bad key');
      });
      readFile.mockRejectedValueOnce(new Error('ENOENT'));
      expect((await service.getVelocitySecrets()).forwardingSecret).toMatch(/^[\w-]{32}$/);
    });
  });

  it('returns router defaults and mints an auto-scale token once', async () => {
    expect(await service.getRouterSettings()).toEqual({
      proxyPort: '25565',
      autoScaleEnabled: false,
      autoScaleToken: null,
      autoScaleDownAfter: '10m',
      autoScaleWakeTimeout: '180s',
      autoScaleAsleepMotd: 'Server is asleep. Join to wake it up!',
      autoScaleLoadingMotd: 'Server is starting...',
      extraNetworks: null,
    });
    expect(await service.getAutoScaleToken()).toBeNull();

    await service.updateRouterSettings({ proxyPort: ' 25566 ', autoScaleEnabled: true, autoScaleDownAfter: '5m', autoScaleWakeTimeout: ' ', autoScaleAsleepMotd: 'zzz', autoScaleLoadingMotd: 'loading', extraNetworks: 'net-a\n' });
    const first = row.autoScaleTokenEnc;
    expect(first).toMatch(/^enc:/);
    const settings = await service.getRouterSettings();
    expect(settings).toMatchObject({ proxyPort: '25566', autoScaleEnabled: true, autoScaleDownAfter: '5m', autoScaleWakeTimeout: '180s', autoScaleAsleepMotd: 'zzz', autoScaleLoadingMotd: 'loading', extraNetworks: 'net-a' });
    expect(settings.autoScaleToken).toBe(first.slice(4));
    expect(await service.getAutoScaleToken()).toBe(first.slice(4));

    await service.updateRouterSettings({ autoScaleEnabled: false, extraNetworks: null });
    expect(row.autoScaleTokenEnc).toBe(first);
    expect(row.proxyExtraNetworks).toBeNull();
    expect(await service.getAutoScaleToken()).toBeNull();

    await service.updateRouterSettings({ autoScaleEnabled: true });
    expect(row.autoScaleTokenEnc).toBe(first);
  });

  it('stores java server defaults', async () => {
    expect(await service.getJavaServerDefaults()).toBeNull();
    await service.setJavaServerDefaults({ maxPlayers: '10' });
    expect(await service.getJavaServerDefaults()).toEqual({ maxPlayers: '10' });
  });

  it('resolves OIDC from env, letting DB values win', async () => {
    expect((await service.getOidc()).enabled).toBe(false);

    config.get.mockImplementation((key: string) =>
      key === 'oidc' ? { issuer: 'https://env', clientId: 'env-id', clientSecret: 'env-secret', redirectUri: 'https://env/cb', disablePasswordLogin: true } : undefined,
    );
    expect(await service.getOidc()).toEqual({
      issuer: 'https://env',
      clientId: 'env-id',
      clientSecret: 'env-secret',
      redirectUri: 'https://env/cb',
      scopes: 'openid email profile',
      providerName: 'SSO',
      disablePasswordLogin: true,
      enabled: true,
    });

    await service.updateIntegrations({ oidc: { issuer: ' https://db ', clientId: 'db-id', clientSecret: 'db-secret', redirectUri: 'https://db/cb', scopes: 'openid', providerName: 'Keycloak', disablePasswordLogin: false } });
    expect(await service.getOidc()).toMatchObject({ issuer: 'https://db', clientId: 'db-id', clientSecret: 'db-secret', scopes: 'openid', providerName: 'Keycloak', disablePasswordLogin: false, enabled: true });

    const pub = await service.getPublic();
    expect(pub.oidc).toMatchObject({ hasClientSecret: true, configured: true, source: 'db' });
    expect(pub.smtp).toMatchObject({ host: '', port: null, hasPassword: false, configured: false, source: 'unset' });
  });

  it('resolves SMTP port and secure flags from env', async () => {
    config.get.mockImplementation((key: string) => (key === 'smtp' ? { host: 'smtp.env', port: '2525', secure: true, user: 'u', pass: 'p', from: 'f' } : undefined));
    expect(await service.getSmtp()).toEqual({ host: 'smtp.env', port: 2525, secure: true, user: 'u', pass: 'p', from: 'f', enabled: true });

    await service.updateIntegrations({ smtp: { port: 587, secure: false } });
    expect(await service.getSmtp()).toMatchObject({ port: 587, secure: false });
    expect((await service.getPublic()).smtp.source).toBe('env');
  });

  it('logs and continues when the preference migration fails', async () => {
    repo.findOne.mockRejectedValueOnce(new Error('db down'));
    userSettingsRepo.find.mockRejectedValueOnce(new Error('db down'));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
