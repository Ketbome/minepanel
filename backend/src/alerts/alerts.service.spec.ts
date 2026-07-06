import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertConfig } from './entities/alert-config.entity';
import { Settings } from 'src/users/entities/settings.entity';
import { DiscordService } from 'src/discord/discord.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertConfigRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let settingsRepo: { findOne: jest.Mock };
  let discordService: { sendCustomMessage: jest.Mock };
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
    discordService = { sendCustomMessage: jest.fn().mockResolvedValue(undefined) };
    dockerComposeService = { getServerConfig: jest.fn().mockResolvedValue({ enableAutoStop: false, enableAutoPause: false }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(AlertConfig), useValue: alertConfigRepo },
        { provide: getRepositoryToken(Settings), useValue: settingsRepo },
        { provide: DiscordService, useValue: discordService },
        { provide: DockerComposeService, useValue: dockerComposeService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
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

    it('should not send anything when no webhook is configured', async () => {
      alertConfigRepo.find.mockResolvedValue([resourceConfig]);
      settingsRepo.findOne.mockResolvedValue(null);

      await service.evaluate({ srv: hot });
      await service.evaluate({ srv: hot });

      expect(discordService.sendCustomMessage).not.toHaveBeenCalled();
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
});
