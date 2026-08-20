import { Test, TestingModule } from '@nestjs/testing';
import { ProxyRouterService } from 'src/proxy/proxy-router.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { ForbiddenException } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from '../services/settings.service';
import { DiscordService } from 'src/discord/discord.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';
import { AuditLogService } from '../services/audit-log.service';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsService: jest.Mocked<SettingsService>;
  let usersService: jest.Mocked<UsersService>;
  let proxyRouter: any;
  let instanceSettings: any;
  let accessControlService: jest.Mocked<AccessControlService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: InstanceSettingsService,
          useValue: {
            getProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
            getNetwork: jest.fn().mockResolvedValue({ publicIp: null, lanIp: null }),
            getJavaServerDefaults: jest.fn().mockResolvedValue(null),
            getRouterSettings: jest.fn().mockResolvedValue({
              proxyPort: '25565',
              autoScaleEnabled: true,
              autoScaleToken: 'super-secret-shared-with-the-router',
              autoScaleDownAfter: '10m',
              autoScaleWakeTimeout: '180s',
              autoScaleAsleepMotd: 'asleep',
              autoScaleLoadingMotd: 'starting',
              extraNetworks: null,
            }),
            setProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
            setNetwork: jest.fn().mockResolvedValue({ publicIp: null, lanIp: null }),
            setJavaServerDefaults: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            updateSettings: jest.fn(),
            getSettings: jest.fn(),
            getProxySettings: jest.fn(),
            getNetworkSettings: jest.fn(),
            getAuditRetentionDays: jest.fn(),
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
            isAdmin: jest.fn(),
          },
        },
        {
          provide: ProxyRouterService,
          useValue: { reconcile: jest.fn().mockResolvedValue(undefined), isRunning: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: AuditLogService,
          useValue: {
            record: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(SettingsController);
    proxyRouter = module.get(ProxyRouterService);
    instanceSettings = module.get(InstanceSettingsService);
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

  it('should enforce high-level permission for audit retention settings', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1, role: 'ADMIN' } as any);
    accessControlService.isAdmin.mockReturnValue(true);
    accessControlService.assertManageSystemSettings.mockImplementation(() => undefined);
    settingsService.updateSettings.mockResolvedValue({} as any);
    settingsService.getAuditRetentionDays.mockResolvedValue(15);

    await controller.updateSettings({ user: { userId: 1, username: 'admin' } }, { auditRetentionDays: 15 });

    expect(accessControlService.assertManageSystemSettings).toHaveBeenCalled();
    expect(settingsService.updateSettings).toHaveBeenCalledWith({ auditRetentionDays: 15 }, 1);
  });

  it('should reject audit retention updates for non-admin users', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 2, role: 'USER' } as any);
    accessControlService.isAdmin.mockReturnValue(false);
    accessControlService.assertManageSystemSettings.mockImplementation(() => undefined);

    await expect(
      controller.updateSettings({ user: { userId: 2, username: 'user' } }, { auditRetentionDays: 15 }),
    ).rejects.toThrow(ForbiddenException);

    expect(settingsService.updateSettings).not.toHaveBeenCalled();
  });

  describe('the settings it hands back', () => {
    const readSettings = async () => {
      settingsService.getSettings.mockResolvedValue({ language: 'en' } as any);
      settingsService.getProxySettings.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com', available: true } as any);
      settingsService.getNetworkSettings.mockResolvedValue({ publicIp: null, lanIp: null } as any);
      settingsService.getAuditRetentionDays.mockResolvedValue(30 as any);
      return controller.getSettings({ user: { userId: 1 } });
    };

    it('never sends the auto-scale token to the browser', async () => {
      const result = await readSettings();

      expect(JSON.stringify(result)).not.toContain('super-secret-shared-with-the-router');
      expect(result.proxy.router).not.toHaveProperty('autoScaleToken');
    });

    // The UI sends the router object straight back when saving, so anything here
    // that the write DTO rejects turns into a 400.
    it('returns a router object that can be sent straight back to the update endpoint', async () => {
      const result = await readSettings();

      const writable = ['proxyPort', 'autoScaleEnabled', 'autoScaleDownAfter', 'autoScaleWakeTimeout', 'autoScaleAsleepMotd', 'autoScaleLoadingMotd', 'extraNetworks'];
      expect(Object.keys(result.proxy.router).sort()).toEqual([...writable].sort());
    });
  });

  describe('powering the proxy on and off', () => {
    it('turns the container on and reports what it ended up as', async () => {
      instanceSettings.setProxy.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
      proxyRouter.isRunning.mockResolvedValue(true);

      const result = await controller.setProxyPower({ user: { userId: 1 } }, { enabled: true });

      expect(instanceSettings.setProxy).toHaveBeenCalledWith({ enabled: true });
      expect(proxyRouter.reconcile).toHaveBeenCalled();
      expect(result).toEqual({ enabled: true, baseDomain: 'mc.example.com', running: true });
    });

    it('turns it off', async () => {
      instanceSettings.setProxy.mockResolvedValue({ enabled: false, baseDomain: 'mc.example.com' });
      proxyRouter.isRunning.mockResolvedValue(false);

      const result = await controller.setProxyPower({ user: { userId: 1 } }, { enabled: false });

      expect(instanceSettings.setProxy).toHaveBeenCalledWith({ enabled: false });
      expect(result.running).toBe(false);
    });

    // Binding a host port is host-affecting, so it needs the same permission as
    // the rest of the system settings.
    it('refuses without the system settings permission', async () => {
      accessControlService.assertManageSystemSettings.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(controller.setProxyPower({ user: { userId: 1 } }, { enabled: true })).rejects.toBeInstanceOf(ForbiddenException);
      expect(proxyRouter.reconcile).not.toHaveBeenCalled();
    });
  });
});
