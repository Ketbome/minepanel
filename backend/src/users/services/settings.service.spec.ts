import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { Settings } from '../entities/settings.entity';
import { UsersService } from './users.service';
import { isEncrypted } from 'src/common/crypto/secret-cipher';

describe('SettingsService', () => {
  const originalSecret = process.env.JWT_SECRET;
  let service: SettingsService;
  let settingsRepo: { findOne: jest.Mock; save: jest.Mock };

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
      ],
    }).compile();

    service = module.get(SettingsService);
  });

  it('clears proxy domain and disables proxy when domain is blank', async () => {
    settingsRepo.findOne.mockResolvedValue({
      userId: 1,
      preferences: {
        proxyEnabled: true,
        proxyBaseDomain: 'mc.example.com',
      },
    });

    const result = await service.updateSettings({ proxy: { proxyEnabled: true, proxyBaseDomain: '   ' } }, 1);

    expect(result.preferences.proxyBaseDomain).toBeNull();
    expect(result.preferences.proxyEnabled).toBe(false);
  });

  it('clears network values when inputs are blank', async () => {
    settingsRepo.findOne.mockResolvedValue({
      userId: 1,
      preferences: {
        publicIp: '1.1.1.1',
        lanIp: '192.168.1.2',
      },
    });

    const result = await service.updateSettings({ network: { publicIp: ' ', lanIp: '' } }, 1);

    expect(result.preferences.publicIp).toBeNull();
    expect(result.preferences.lanIp).toBeNull();
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
