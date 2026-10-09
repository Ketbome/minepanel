import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertConfig } from './entities/alert-config.entity';
import { Settings } from 'src/users/entities/settings.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertConfigRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let settingsRepo: { findOne: jest.Mock };
  let discordService: { sendCustomMessage: jest.Mock; sendOperationalAlert: jest.Mock; getAlertRules: jest.Mock };
  let dockerComposeService: { getServerConfig: jest.Mock };

  const running = { status: 'running', cpuUsage: '10%', memoryUsage: '512MiB', memoryLimit: '1GiB' };
  const stopped = { status: 'stopped', cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A' };

  const downConfig = (overrides: Partial<AlertConfig> = {}): AlertConfig =>
    ({
      id: 1,
      serverId: 'srv',
      downAlertEnabled: true,
      resourceAlertEnabled: false,
      cpuThresholdPercent: 90,
      memoryThresholdPercent: 90,
      sustainedMinutes: 5,
      cooldownMinutes: 30,
      createdAt: new Date(),
      ...overrides,
    }) as AlertConfig;

  beforeEach(async () => {
    alertConfigRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    settingsRepo = {
      findOne: jest.fn().mockResolvedValue({ discordWebhook: 'https://discord.test/webhook', language: 'en' }),
    };
    discordService = { getAlertRules: jest.fn().mockResolvedValue({ enabled: true, gameAlertEnabled: false }), sendCustomMessage: jest.fn().mockResolvedValue(undefined), sendOperationalAlert: jest.fn().mockResolvedValue(undefined) };
    dockerComposeService = { getServerConfig: jest.fn().mockResolvedValue({ enableAutoStop: false, enableAutoPause: false }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(AlertConfig), useValue: alertConfigRepo },
        { provide: getRepositoryToken(Settings), useValue: settingsRepo },
        { provide: NotificationsService, useValue: discordService },
        { provide: DockerComposeService, useValue: dockerComposeService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('crash alerts', () => {
    const starting = { ...stopped, status: 'starting' };
    const crashConfig = { restartPolicy: 'on-failure', restartMaxRetries: 3 };

    it('should send one crash alert with exit code and log tail when retries run out', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 1, logTail: 'Exception in server tick loop' });

      await service.evaluate({ srv: starting }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(1);
      const [, title, , color, fields] = discordService.sendCustomMessage.mock.calls[0];
      expect(title).toContain('crash loop');
      expect(color).toBe('error');
      expect(fields.map((f) => f.value)).toEqual(expect.arrayContaining(['`1`', '`3`', expect.stringContaining('Exception in server tick loop')]));
    });

    it('should replace the down alert when a running server crashes out', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 1, logTail: '' });

      await service.evaluate({ srv: running }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(1);
      expect(discordService.sendCustomMessage.mock.calls[0][1]).toContain('crash loop');
    });

    it('should truncate long log tails to fit a Discord field', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 1, logTail: 'x'.repeat(5000) });

      await service.evaluate({ srv: starting }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      const fields = discordService.sendCustomMessage.mock.calls[0][4];
      expect(fields[3].value.length).toBeLessThanOrEqual(1024);
    });

    it('should fall back to the down alert on a clean exit', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 0, logTail: '' });

      await service.evaluate({ srv: running }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(1);
      expect(discordService.sendCustomMessage.mock.calls[0][1]).toContain('Server Down');
    });

    it('should not inspect servers without a retry limit', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue({ restartPolicy: 'on-failure' });
      const readCrashInfo = jest.fn();

      await service.evaluate({ srv: starting }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(readCrashInfo).not.toHaveBeenCalled();
      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    });

    it('should not alert after a stop requested from the panel', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 143, logTail: '' });

      await service.evaluate({ srv: running }, readCrashInfo);
      service.markExpectedStop('srv');
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(readCrashInfo).not.toHaveBeenCalled();
      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    });

    it('should skip the crash check when the config cannot be read', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockRejectedValue(new Error('gone'));
      const readCrashInfo = jest.fn();

      await service.evaluate({ srv: running }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(readCrashInfo).not.toHaveBeenCalled();
      expect(discordService.sendCustomMessage.mock.calls[0][1]).toContain('Server Down');
    });

    it('should respect the cooldown and still suppress the down alert', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 1, logTail: '' });

      await service.evaluate({ srv: starting }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);
      await service.evaluate({ srv: starting }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(1);
    });

    it('should not throw when the webhook call fails', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      settingsRepo.findOne.mockRejectedValue(new Error('db down'));
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 1, logTail: '' });

      await service.evaluate({ srv: starting }, readCrashInfo);
      await expect(service.evaluate({ srv: stopped }, readCrashInfo)).resolves.toBeUndefined();
    });

    it('should dispatch crash alerts to other channels without a webhook', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue(crashConfig);
      settingsRepo.findOne.mockResolvedValue(null);
      const readCrashInfo = jest.fn().mockResolvedValue({ exitCode: 1, logTail: '' });

      await service.evaluate({ srv: starting }, readCrashInfo);
      await service.evaluate({ srv: stopped }, readCrashInfo);

      expect(discordService.sendCustomMessage).toHaveBeenCalledWith('', expect.any(String), expect.any(String), 'error', expect.any(Array));
    });
  });

  describe('down alerts', () => {
    it('should alert when a running server transitions to stopped', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);

      await service.evaluate({ srv: running });
      await service.evaluate({ srv: stopped });

      expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(1);
      expect(discordService.sendCustomMessage.mock.calls[0][3]).toBe('error');
    });

    it('should not alert on the first observation of a stopped server', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);

      await service.evaluate({ srv: stopped });

      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    });

    it('should suppress the alert after an expected stop', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);

      await service.evaluate({ srv: running });
      service.markExpectedStop('srv');
      await service.evaluate({ srv: stopped });

      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    });

    it('should suppress the alert for auto-stop servers', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      dockerComposeService.getServerConfig.mockResolvedValue({ enableAutoStop: true });

      await service.evaluate({ srv: running });
      await service.evaluate({ srv: stopped });

      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    });

    it('should respect the cooldown between down alerts', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);

      await service.evaluate({ srv: running });
      await service.evaluate({ srv: stopped });
      await service.evaluate({ srv: running });
      await service.evaluate({ srv: stopped });

      expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(1);
    });

    it('should not alert when no config exists for the server', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig({ serverId: 'other' })]);

      await service.evaluate({ srv: running });
      await service.evaluate({ srv: stopped });

      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    });
  });

  describe('resource alerts', () => {
    const resourceConfig = downConfig({ downAlertEnabled: false, resourceAlertEnabled: true, cpuThresholdPercent: 50, memoryThresholdPercent: 50, sustainedMinutes: 2 });
    const hot = { status: 'running', cpuUsage: '80%', memoryUsage: '900MiB', memoryLimit: '1GiB' };

    it('should alert only after the threshold is sustained for the configured samples', async () => {
      alertConfigRepo.find.mockResolvedValue([resourceConfig]);

      await service.evaluate({ srv: hot });
      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();

      await service.evaluate({ srv: hot });
      // one CPU alert and one memory alert
      expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(2);
    });

    it('should reset the counter when usage recovers', async () => {
      alertConfigRepo.find.mockResolvedValue([resourceConfig]);
      const cool = { status: 'running', cpuUsage: '5%', memoryUsage: '100MiB', memoryLimit: '1GiB' };

      await service.evaluate({ srv: hot });
      await service.evaluate({ srv: cool });
      await service.evaluate({ srv: hot });

      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    });

    it('should dispatch down alerts to other channels without a webhook', async () => {
      alertConfigRepo.find.mockResolvedValue([resourceConfig]);
      settingsRepo.findOne.mockResolvedValue(null);

      await service.evaluate({ srv: hot });
      await service.evaluate({ srv: hot });

      expect(discordService.sendCustomMessage).toHaveBeenCalledWith('', expect.any(String), expect.any(String), 'warning', expect.any(Array));
    });
  });

  describe('config management', () => {
    it('should return defaults when no config is stored', async () => {
      const config = await service.getConfig('srv');

      expect(alertConfigRepo.create).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'srv', cpuThresholdPercent: 90, cooldownMinutes: 30 }));
      expect(config.serverId).toBe('srv');
    });

    it('should merge updates over the existing config', async () => {
      alertConfigRepo.findOne.mockResolvedValue(downConfig());

      await service.updateConfig('srv', { cpuThresholdPercent: 75 });

      expect(alertConfigRepo.save).toHaveBeenCalledWith(expect.objectContaining({ serverId: 'srv', cpuThresholdPercent: 75 }));
    });
  });
  describe('incident recovery', () => {
    it('retries recovery on the next healthy sample if dispatch rejects', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      await service.evaluate({ srv: running });
      await service.evaluate({ srv: stopped });
      discordService.sendOperationalAlert.mockRejectedValueOnce(new Error('settings unavailable'));

      await expect(service.evaluate({ srv: running })).rejects.toThrow('settings unavailable');
      await service.evaluate({ srv: running });
      await service.evaluate({ srv: running });

      expect(discordService.sendOperationalAlert).toHaveBeenCalledTimes(2);
      expect(discordService.sendOperationalAlert).toHaveBeenLastCalledWith('recovery', 'srv', 'down', 'error');
    });

    it('reports recovery exactly once after an unexpected down transition', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig()]);
      await service.evaluate({ srv: running });await service.evaluate({ srv: stopped });
      await service.evaluate({ srv: running });await service.evaluate({ srv: running });
      expect(discordService.sendOperationalAlert).toHaveBeenCalledTimes(1);
      expect(discordService.sendOperationalAlert).toHaveBeenCalledWith('recovery', 'srv', 'down', 'error');
    });

    it('does not call recovery after planned stops or unknown resource readings', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig({ resourceAlertEnabled: true, sustainedMinutes: 1 })]);
      await service.evaluate({ srv: running });service.markExpectedStop('srv');
      await service.evaluate({ srv: stopped });await service.evaluate({ srv: running });
      expect(discordService.sendOperationalAlert).not.toHaveBeenCalled();
      await service.evaluate({ srv: { ...running, cpuUsage: '95%' } });
      await service.evaluate({ srv: { ...running, cpuUsage: 'N/A', memoryUsage: 'N/A' } });
      expect(discordService.sendOperationalAlert).not.toHaveBeenCalled();
      await service.evaluate({ srv: running });await service.evaluate({ srv: running });
      expect(discordService.sendOperationalAlert).toHaveBeenCalledTimes(1);
      expect(discordService.sendOperationalAlert).toHaveBeenCalledWith('recovery', 'srv', 'cpu', 'warning');
    });

    it('recovers memory incidents only from available memory measurements', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig({ resourceAlertEnabled: true, sustainedMinutes: 1 })]);
      await service.evaluate({ srv: { ...running, memoryUsage: '950MiB' } });
      await service.evaluate({ srv: { ...running, memoryUsage: 'N/A' } });
      expect(discordService.sendOperationalAlert).not.toHaveBeenCalled();
      await service.evaluate({ srv: running });
      expect(discordService.sendOperationalAlert).toHaveBeenCalledWith('recovery', 'srv', 'memory', 'warning');
    });

    it('clears incident state when its rule is disabled', async () => {
      alertConfigRepo.find.mockResolvedValue([downConfig({ resourceAlertEnabled: true, sustainedMinutes: 1 })]);
      await service.evaluate({ srv: { ...running, cpuUsage: '95%' } });
      alertConfigRepo.find.mockResolvedValue([downConfig({ resourceAlertEnabled: false })]);
      await service.evaluate({ srv: running });
      expect(discordService.sendOperationalAlert).not.toHaveBeenCalled();
    });
  });
  it('does not create incidents or consume cooldowns while all alerts are disabled', async () => {
    alertConfigRepo.find.mockResolvedValue([downConfig({ resourceAlertEnabled: true, sustainedMinutes: 1 })]);
    discordService.getAlertRules.mockResolvedValue({ enabled: false });
    await service.evaluate({ srv: running });
    await service.evaluate({ srv: { ...running, cpuUsage: '95%', memoryUsage: '950MiB' } });
    await service.evaluate({ srv: stopped });
    expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    discordService.getAlertRules.mockResolvedValue({ enabled: true });
    await service.evaluate({ srv: running });
    expect(discordService.sendOperationalAlert).not.toHaveBeenCalled();
    await service.evaluate({ srv: { ...running, cpuUsage: '95%', memoryUsage: '950MiB' } });
    expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(2);
  });

  it('forgets incidents and cooldowns when globally disabled, even with no resource sample', async () => {
    alertConfigRepo.find.mockResolvedValue([downConfig({ resourceAlertEnabled: true, sustainedMinutes: 1 })]);
    await service.evaluate({ srv: { ...running, cpuUsage: '95%' } });
    discordService.getAlertRules.mockResolvedValue({ enabled: false });
    await service.evaluate({});
    discordService.getAlertRules.mockResolvedValue({ enabled: true });
    await service.evaluate({ srv: running });
    expect(discordService.sendOperationalAlert).not.toHaveBeenCalled();
    await service.evaluate({ srv: { ...running, cpuUsage: '95%' } });
    expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(2);
  });

  it('resets sustained samples while disabled but preserves expected panel stops', async () => {
    alertConfigRepo.find.mockResolvedValue([downConfig({ resourceAlertEnabled: true, sustainedMinutes: 2 })]);
    const busy = { ...running, cpuUsage: '95%' };
    await service.evaluate({ srv: busy });
    service.markExpectedStop('srv');
    discordService.getAlertRules.mockResolvedValue({ enabled: false });
    await service.evaluate({ srv: busy });
    discordService.getAlertRules.mockResolvedValue({ enabled: true });
    await service.evaluate({ srv: stopped });
    await service.evaluate({ srv: busy });
    expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
    await service.evaluate({ srv: busy });
    expect(discordService.sendCustomMessage).toHaveBeenCalledTimes(1);
  });

  it('retains an open incident through an empty failed sample', async () => {
    alertConfigRepo.find.mockResolvedValue([downConfig()]);
    await service.evaluate({ srv: running });await service.evaluate({ srv: stopped });
    await service.evaluate({});await service.evaluate({ srv: running });
    expect(discordService.sendOperationalAlert).toHaveBeenCalledWith('recovery', 'srv', 'down', 'error');
  });
  it('alerts on sustained measured game failures, with startup grace and unknown-sample isolation', async () => {
    discordService.getAlertRules.mockResolvedValue({ enabled: true, gameAlertEnabled: true, gameFailureSamples: 2, gameStartupGraceMinutes: 5, cooldownMinutes: 60 });
    dockerComposeService.getServerConfig.mockResolvedValue({});
    const failed = { ...running, gameQueryStatus: 'failed' as const, uptimeSeconds: 600 };
    await service.evaluate({ srv: { ...failed, uptimeSeconds: 30 } });
    await service.evaluate({ srv: failed });
    await service.evaluate({ srv: { ...failed, gameQueryStatus: 'unknown' } });
    await service.evaluate({ srv: failed });
    expect(discordService.sendOperationalAlert).not.toHaveBeenCalled();
    await service.evaluate({ srv: failed });
    expect(discordService.sendOperationalAlert).toHaveBeenCalledWith('game', 'srv', expect.any(String));
    await service.evaluate({ srv: { ...failed, gameQueryStatus: 'unknown' } });
    expect(discordService.sendOperationalAlert).toHaveBeenCalledTimes(1);
    await service.evaluate({ srv: { ...failed, gameQueryStatus: 'healthy' } });
    expect(discordService.sendOperationalAlert).toHaveBeenLastCalledWith('recovery', 'srv', 'game', 'warning');
  });
});
