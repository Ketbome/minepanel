import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { Settings } from '../entities/settings.entity';
import { UsersService } from './users.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let settingsRepo: { findOne: jest.Mock; save: jest.Mock };

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
});
