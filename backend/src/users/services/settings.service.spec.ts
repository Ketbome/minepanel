import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { ProxyRouterService } from 'src/proxy/proxy-router.service';
import { Settings } from '../entities/settings.entity';
import { UsersService } from './users.service';
import { isEncrypted } from 'src/common/crypto/secret-cipher';

describe('SettingsService', () => {
  const originalSecret = process.env.JWT_SECRET;
  let service: SettingsService;
  let settingsRepo: { findOne: jest.Mock; save: jest.Mock };
  let instanceSettings: any;

  beforeAll(() => {
    process.env.JWT_SECRET = 'settings-service-test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(async () => {
    settingsRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
    };

    instanceSettings = {
      setProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
      setNetwork: jest.fn().mockResolvedValue({ publicIp: null, lanIp: null }),
      setJavaServerDefaults: jest.fn().mockResolvedValue(undefined),
      getProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
      getNetwork: jest.fn().mockResolvedValue({ publicIp: null, lanIp: null }),
      getJavaServerDefaults: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(Settings),
          useValue: settingsRepo,
        },
        {
          provide: UsersService,
          useValue: {
            getUserById: jest.fn().mockResolvedValue({ id: 1 }),
          },
        },
        { provide: InstanceSettingsService, useValue: instanceSettings },
        { provide: ProxyRouterService, useValue: { reconcile: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(SettingsService);
  });

  // Proxy and network settings describe the instance, not the user, so this
  // service only forwards them; the behaviour lives in InstanceSettingsService.
  it('forwards proxy settings to the instance settings, normalising blanks to null', async () => {
    settingsRepo.findOne.mockResolvedValue({ userId: 1, preferences: {} });

    await service.updateSettings({ proxy: { proxyEnabled: true, proxyBaseDomain: '   ' } }, 1);

    expect(instanceSettings.setProxy).toHaveBeenCalledWith({ enabled: true, baseDomain: null });
  });

  it('forwards network settings to the instance settings, normalising blanks to null', async () => {
    settingsRepo.findOne.mockResolvedValue({ userId: 1, preferences: {} });

    await service.updateSettings({ network: { publicIp: ' ', lanIp: '' } }, 1);

    expect(instanceSettings.setNetwork).toHaveBeenCalledWith({ publicIp: null, lanIp: null });
  });

  it('does not keep proxy or network values in the user preferences', async () => {
    settingsRepo.findOne.mockResolvedValue({ userId: 1, preferences: {} });

    const result = await service.updateSettings({ proxy: { proxyEnabled: true, proxyBaseDomain: 'mc.example.com' } }, 1);

    expect(result.preferences?.proxyBaseDomain).toBeUndefined();
    expect(result.preferences?.proxyEnabled).toBeUndefined();
  });

  it('stores the CurseForge API key encrypted and decrypts it for server-side use', async () => {
    const row: any = { userId: 1 };
    settingsRepo.findOne.mockResolvedValue(row);

    const result = await service.updateSettings({ cfApiKey: 'cf-plain-key' }, 1);
    expect(isEncrypted(result.cfApiKey)).toBe(true);
    expect(result.cfApiKey).not.toContain('cf-plain-key');

    expect(await service.getCfApiKey(1)).toBe('cf-plain-key');
  });

  it('clears the CurseForge API key when an empty string is sent', async () => {
    settingsRepo.findOne.mockResolvedValue({ userId: 1, cfApiKey: 'enc:v1:something' });
    const result = await service.updateSettings({ cfApiKey: '' }, 1);
    expect(result.cfApiKey).toBeNull();
  });
});
