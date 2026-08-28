jest.mock('../common/crypto/secret-cipher', () => ({
  encryptSecret: jest.fn((value: string) => `enc:${value}`),
  decryptSecret: jest.fn((value: string) => value.replace(/^enc:/, '')),
}));

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
