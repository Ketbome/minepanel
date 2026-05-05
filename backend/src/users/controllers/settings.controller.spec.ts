import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from '../services/settings.service';
import { DiscordService } from 'src/discord/discord.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsService: jest.Mocked<SettingsService>;
  let usersService: jest.Mocked<UsersService>;
  let accessControlService: jest.Mocked<AccessControlService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: {
            updateSettings: jest.fn(),
            getSettings: jest.fn(),
            getProxySettings: jest.fn(),
            getNetworkSettings: jest.fn(),
          },
        },
        {
          provide: DiscordService,
          useValue: {
            testWebhook: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            getRequiredUserById: jest.fn(),
          },
        },
        {
          provide: AccessControlService,
          useValue: {
            assertManageSystemSettings: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(SettingsController);
    settingsService = module.get(SettingsService);
    usersService = module.get(UsersService);
    accessControlService = module.get(AccessControlService);
  });

  it('should allow low-risk settings without high-level permission', async () => {
    settingsService.updateSettings.mockResolvedValue({ language: 'en' } as any);

    await controller.updateSettings({ user: { userId: 1 } }, { language: 'en' });

    expect(usersService.getRequiredUserById).not.toHaveBeenCalled();
    expect(accessControlService.assertManageSystemSettings).not.toHaveBeenCalled();
    expect(settingsService.updateSettings).toHaveBeenCalledWith({ language: 'en' }, 1);
  });

  it('should enforce high-level permission for network settings', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1 } as any);
    accessControlService.assertManageSystemSettings.mockImplementation(() => {
      throw new ForbiddenException('forbidden');
    });

    await expect(
      controller.updateSettings({ user: { userId: 1 } }, { network: { publicIp: '1.1.1.1' } }),
    ).rejects.toThrow(ForbiddenException);

    expect(accessControlService.assertManageSystemSettings).toHaveBeenCalled();
    expect(settingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('should enforce high-level permission for integration settings', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1 } as any);
    accessControlService.assertManageSystemSettings.mockImplementation(() => {
      throw new ForbiddenException('forbidden');
    });

    await expect(
      controller.updateSettings({ user: { userId: 1 } }, { discordWebhook: 'https://discord.test' }),
    ).rejects.toThrow(ForbiddenException);

    expect(accessControlService.assertManageSystemSettings).toHaveBeenCalled();
    expect(settingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('should enforce high-level permission for java defaults', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1 } as any);
    accessControlService.assertManageSystemSettings.mockImplementation(() => undefined);
    settingsService.updateSettings.mockResolvedValue({} as any);

    await controller.updateSettings(
      { user: { userId: 1 } },
      { javaServerDefaults: { maxMemory: '4G' } },
    );

    expect(accessControlService.assertManageSystemSettings).toHaveBeenCalled();
    expect(settingsService.updateSettings).toHaveBeenCalledWith(
      { javaServerDefaults: { maxMemory: '4G' } },
      1,
    );
  });
});
