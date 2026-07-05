import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { ScheduledTask } from './entities/scheduled-task.entity';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';

describe('ScheduledTasksService', () => {
  let service: ScheduledTasksService;
  let taskRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock; remove: jest.Mock };
  let serverManagement: { restartServer: jest.Mock; executeCommand: jest.Mock };
  let dockerCompose: { getServerConfig: jest.Mock };

  beforeEach(async () => {
    taskRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };
    serverManagement = { restartServer: jest.fn(), executeCommand: jest.fn() };
    dockerCompose = { getServerConfig: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledTasksService,
        { provide: getRepositoryToken(ScheduledTask), useValue: taskRepo },
        { provide: ServerManagementService, useValue: serverManagement },
        { provide: DockerComposeService, useValue: dockerCompose },
      ],
    }).compile();

    service = module.get<ScheduledTasksService>(ScheduledTasksService);
  });

  describe('create', () => {
    it('should reject a command task without a command', async () => {
      await expect(
        service.create('srv', { name: 't', type: 'command', intervalMinutes: 5 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should null the command and schedule the next run for a restart task', async () => {
      const before = Date.now();

      const task = await service.create('srv', { name: 'restart', type: 'restart', intervalMinutes: 10 } as any);

      expect(task.command).toBeNull();
      expect(task.nextRunAt.getTime()).toBeGreaterThanOrEqual(before + 10 * 60 * 1000);
    });

    it('should keep the command for a command task', async () => {
      const task = await service.create('srv', {
        name: 'say-hi',
        type: 'command',
        command: 'say hi',
        intervalMinutes: 15,
      } as any);

      expect(task.command).toBe('say hi');
    });
  });

  describe('create with cron schedule', () => {
    it('should compute nextRunAt from the cron expression', async () => {
      const task = await service.create('srv', { name: 'nightly', type: 'restart', scheduleKind: 'cron', cronExpression: '0 4 * * *' } as any);

      expect(task.scheduleKind).toBe('cron');
      expect(task.intervalMinutes).toBeNull();
      expect(task.cronExpression).toBe('0 4 * * *');
      expect(task.nextRunAt.getHours()).toBe(4);
      expect(task.nextRunAt.getMinutes()).toBe(0);
      expect(task.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject an invalid cron expression', async () => {
      await expect(service.create('srv', { name: 'bad', type: 'restart', scheduleKind: 'cron', cronExpression: 'not a cron' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject a cron task without an expression', async () => {
      await expect(service.create('srv', { name: 'bad', type: 'restart', scheduleKind: 'cron' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject an interval task without intervalMinutes', async () => {
      await expect(service.create('srv', { name: 'bad', type: 'restart' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update schedule kind', () => {
    it('should switch an interval task to cron and recompute nextRunAt', async () => {
      taskRepo.findOne.mockResolvedValue({
        id: 1,
        serverId: 'srv',
        type: 'restart',
        command: null,
        scheduleKind: 'interval',
        intervalMinutes: 10,
        cronExpression: null,
        enabled: true,
        nextRunAt: new Date(0),
      });

      const task = await service.update('srv', 1, { scheduleKind: 'cron', cronExpression: '*/5 * * * *' } as any);

      expect(task.scheduleKind).toBe('cron');
      expect(task.intervalMinutes).toBeNull();
      expect(task.cronExpression).toBe('*/5 * * * *');
      expect(task.nextRunAt.getTime()).toBeGreaterThan(Date.now());
      expect(task.nextRunAt.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
    });
  });

  describe('getOwnedTask (via remove)', () => {
    it('should throw NotFoundException when the task belongs to another server', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 1, serverId: 'other' });

      await expect(service.remove('srv', 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('srv', 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should recompute nextRunAt when the interval changes', async () => {
      taskRepo.findOne.mockResolvedValue({
        id: 1,
        serverId: 'srv',
        type: 'restart',
        command: null,
        intervalMinutes: 10,
        enabled: true,
        nextRunAt: new Date(0),
      });
      const before = Date.now();

      const task = await service.update('srv', 1, { intervalMinutes: 30 } as any);

      expect(task.intervalMinutes).toBe(30);
      expect(task.nextRunAt.getTime()).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);
    });

    it('should reject changing a task to command type without a command', async () => {
      taskRepo.findOne.mockResolvedValue({
        id: 1,
        serverId: 'srv',
        type: 'restart',
        command: null,
        intervalMinutes: 10,
        enabled: true,
        nextRunAt: new Date(),
      });

      await expect(service.update('srv', 1, { type: 'command' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('runNow', () => {
    it('should skip a command task when RCON port is not configured', async () => {
      taskRepo.findOne.mockResolvedValue({
        id: 1,
        serverId: 'srv',
        type: 'command',
        command: 'say hi',
        intervalMinutes: 10,
        enabled: true,
        nextRunAt: new Date(),
      });
      dockerCompose.getServerConfig.mockResolvedValue({ rconPort: '' });

      const task = await service.runNow('srv', 1);

      expect(task.lastResult).toContain('RCON port not configured');
      expect(serverManagement.executeCommand).not.toHaveBeenCalled();
    });

    it('should restart the server for a restart task', async () => {
      taskRepo.findOne.mockResolvedValue({
        id: 1,
        serverId: 'srv',
        type: 'restart',
        command: null,
        intervalMinutes: 10,
        enabled: true,
        nextRunAt: new Date(),
      });
      serverManagement.restartServer.mockResolvedValue(true);

      const task = await service.runNow('srv', 1);

      expect(serverManagement.restartServer).toHaveBeenCalledWith('srv');
      expect(task.lastResult).toBe('Server restarted');
    });
  });
});
