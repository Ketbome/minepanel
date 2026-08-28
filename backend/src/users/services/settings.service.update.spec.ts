import { NotFoundException } from '@nestjs/common';

jest.mock('src/common/crypto/secret-cipher', () => ({
  encryptSecret: jest.fn((value: string) => `enc:${value}`),
  decryptSecret: jest.fn((value: string) => value.replace(/^enc:/, '')),
}));

import { SettingsService } from './settings.service';

describe('SettingsService updates', () => {
  let service: SettingsService;
  let repo: Record<string, jest.Mock>;
  let usersService: { getUserById: jest.Mock };
  let instanceSettings: Record<string, jest.Mock>;
  let proxyRouter: { reconcile: jest.Mock };

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue({ userId: 1, preferences: { language: 'en' } }),
      find: jest.fn().mockResolvedValue([{ id: 1, preferences: { auditRetentionDays: 30 } }]),
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => entity),
    };
    usersService = { getUserById: jest.fn().mockResolvedValue({ id: 1 }) };
    instanceSettings = {
      setProxy: jest.fn().mockResolvedValue(undefined),
      updateRouterSettings: jest.fn().mockResolvedValue(undefined),
      setNetwork: jest.fn().mockResolvedValue(undefined),
      setJavaServerDefaults: jest.fn().mockResolvedValue(undefined),
      getProxy: jest.fn().mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' }),
      getNetwork: jest.fn().mockResolvedValue({ publicIp: '1.2.3.4', lanIp: null }),
    };
    proxyRouter = { reconcile: jest.fn().mockResolvedValue(undefined) };
    service = new SettingsService(repo as any, usersService as any, instanceSettings as any, proxyRouter as any);
  });

  it('getSettings and createSettings', async () => {
    expect(await service.getSettings(1)).toMatchObject({ userId: 1 });
    usersService.getUserById.mockResolvedValueOnce(null);
    await expect(service.getSettings(2)).rejects.toThrow('User not found');
    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.getSettings(1)).rejects.toThrow('Settings not found');

    expect(await service.createSettings(3)).toEqual({ userId: 3 });
    repo.create.mockReturnValueOnce(null);
    await expect(service.createSettings(3)).rejects.toThrow(NotFoundException);
  });

  it('updateSettings routes instance-wide sections and keeps the rest on the user', async () => {
    const dto: any = {
      proxy: { proxyEnabled: true, proxyBaseDomain: '  mc.example.com ', router: { proxyPort: 25565 } },
      network: { publicIp: ' ', lanIp: '10.0.0.5' },
      javaServerDefaults: { maxPlayers: '20', unknown: 'x', difficulty: '  ', viewDistance: undefined },
      auditRetentionDays: 7,
      cfApiKey: 'cf-key',
      preferences: { language: 'es' },
    };

    const saved = await service.updateSettings(dto, 1);

    expect(instanceSettings.setProxy).toHaveBeenCalledWith({ enabled: true, baseDomain: 'mc.example.com' });
    expect(instanceSettings.updateRouterSettings).toHaveBeenCalledWith({ proxyPort: 25565 });
    expect(proxyRouter.reconcile).toHaveBeenCalled();
    expect(instanceSettings.setNetwork).toHaveBeenCalledWith({ publicIp: null, lanIp: '10.0.0.5' });
    expect(instanceSettings.setJavaServerDefaults).toHaveBeenCalledWith({ maxPlayers: '20' });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ preferences: expect.objectContaining({ auditRetentionDays: 7 }) }));
    expect(saved).toMatchObject({ cfApiKey: 'enc:cf-key', preferences: { language: 'es' } });
    expect(dto.proxy).toBeUndefined();
  });

  it('updateSettings handles undefined and null optional text and clears the api key', async () => {
    await service.updateSettings({ proxy: { proxyEnabled: false }, network: { publicIp: null }, cfApiKey: '' } as any, 1);
    expect(instanceSettings.setProxy).toHaveBeenCalledWith({ enabled: false, baseDomain: undefined });
    expect(instanceSettings.setNetwork).toHaveBeenCalledWith({ publicIp: null, lanIp: undefined });
    expect(repo.save).toHaveBeenLastCalledWith(expect.objectContaining({ cfApiKey: null }));
  });

  it('updateSettings validates the user and settings rows', async () => {
    usersService.getUserById.mockResolvedValueOnce(null);
    await expect(service.updateSettings({} as any, 9)).rejects.toThrow('User not found');
    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.updateSettings({} as any, 1)).rejects.toThrow('Settings not found');
    repo.find.mockResolvedValueOnce([]);
    await expect(service.updateSettings({ auditRetentionDays: 3 } as any, 1)).rejects.toThrow('Settings not found');
  });

  it('decrypts the api key only server-side', async () => {
    repo.findOne.mockResolvedValueOnce({ cfApiKey: 'enc:secret' });
    expect(await service.getCfApiKey(1)).toBe('secret');
    repo.findOne.mockResolvedValueOnce(null);
    expect(await service.getCfApiKey(1)).toBe('');
  });

  it('exposes proxy, network and retention settings', async () => {
    expect(await service.getProxySettings()).toEqual({ enabled: true, baseDomain: 'mc.example.com', available: true });
    expect(await service.getNetworkSettings()).toEqual({ publicIp: '1.2.3.4', lanIp: null });
    expect(await service.getAuditRetentionDays()).toBe(30);
    repo.find.mockResolvedValueOnce([{ id: 1, preferences: { auditRetentionDays: 0 } }]);
    expect(await service.getAuditRetentionDays()).toBe(15);
    repo.find.mockResolvedValueOnce([]);
    expect(await service.getFirstUserSettings()).toBeNull();
  });
});
