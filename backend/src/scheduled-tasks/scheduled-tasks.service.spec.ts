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
  describe('remaining behaviour', () => {
    const baseTask = () => ({ id: 1, serverId: 'srv', name: 't', type: 'command', command: 'say hi', scheduleKind: 'interval', intervalMinutes: 10, cronExpression: null, enabled: true, nextRunAt: new Date(), lastRunAt: null, lastResult: null });

    it('lists tasks per server', async () => {
      taskRepo.find.mockResolvedValue(['task']);
      expect(await service.listByServer('srv')).toEqual(['task']);
      expect(taskRepo.find).toHaveBeenCalledWith({ where: { serverId: 'srv' }, order: { createdAt: 'ASC' } });
    });

    it('update changes name, command, type and re-enables with a fresh nextRunAt', async () => {
      const task: any = { ...baseTask(), enabled: false, nextRunAt: new Date(0) };
      taskRepo.findOne.mockResolvedValue(task);

      const updated = await service.update('srv', 1, { name: 'renamed', command: 'stop', enabled: true });
      expect(updated).toMatchObject({ name: 'renamed', command: 'stop', enabled: true });
      expect(updated.nextRunAt.getTime()).toBeGreaterThan(Date.now());

      await service.update('srv', 1, { type: 'restart' });
      expect(task.command).toBeNull();

      await service.update('srv', 1, { enabled: false });
      expect(task.enabled).toBe(false);
    });

    it('update keeps the schedule when nothing schedule-related changed', async () => {
      const task: any = { ...baseTask(), nextRunAt: new Date(123) };
      taskRepo.findOne.mockResolvedValue(task);
      await service.update('srv', 1, { scheduleKind: 'interval', intervalMinutes: 10 });
      expect(task.nextRunAt.getTime()).toBe(123);
    });

    it('remove deletes an owned task', async () => {
      const task = baseTask();
      taskRepo.findOne.mockResolvedValue(task);
      await service.remove('srv', 1);
      expect(taskRepo.remove).toHaveBeenCalledWith(task);
    });

    it('runNow executes restart and command tasks and records the result', async () => {
      const restart: any = { ...baseTask(), type: 'restart', command: null };
      taskRepo.findOne.mockResolvedValue(restart);
      serverManagement.restartServer.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      expect((await service.runNow('srv', 1)).lastResult).toBe('Server restarted');
      expect((await service.runNow('srv', 1)).lastResult).toBe('Failed to restart server');
      expect(restart.lastRunAt).toBeInstanceOf(Date);

      const command: any = baseTask();
      taskRepo.findOne.mockResolvedValue(command);
      dockerCompose.getServerConfig.mockResolvedValue({ rconPort: '25575', rconPassword: 'pw' });
      serverManagement.executeCommand.mockResolvedValueOnce({ success: true, output: 'done' }).mockResolvedValueOnce({ success: true, output: '' }).mockResolvedValueOnce({ success: false, output: 'nope' });
      expect((await service.runNow('srv', 1)).lastResult).toBe('done');
      expect((await service.runNow('srv', 1)).lastResult).toBe('Command executed');
      expect((await service.runNow('srv', 1)).lastResult).toBe('Command failed: nope');
      expect(serverManagement.executeCommand).toHaveBeenCalledWith('srv', 'say hi', '25575', 'pw');

      const empty: any = { ...baseTask(), command: null };
      taskRepo.findOne.mockResolvedValue(empty);
      expect((await service.runNow('srv', 1)).lastResult).toBe('No command configured');

      taskRepo.findOne.mockResolvedValue(command);
      serverManagement.executeCommand.mockRejectedValueOnce(new Error('rcon down'));
      expect((await service.runNow('srv', 1)).lastResult).toBe('Execution failed: rcon down');
    });

    it('runs due tasks on the timer, skipping overlapping runs and surviving errors', async () => {
      jest.useFakeTimers();
      try {
        const due: any = { ...baseTask(), type: 'restart' };
        taskRepo.find.mockResolvedValueOnce([due]).mockRejectedValueOnce(new Error('db'));
        serverManagement.restartServer.mockResolvedValue(true);

        service.onModuleInit();
        await jest.advanceTimersByTimeAsync(30_000);
        expect(serverManagement.restartServer).toHaveBeenCalledWith('srv');
        expect(taskRepo.save).toHaveBeenCalledWith(expect.objectContaining({ lastResult: 'Server restarted' }));

        await jest.advanceTimersByTimeAsync(30_000);
        expect(taskRepo.find).toHaveBeenCalledTimes(2);

        (service as any).running = true;
        await jest.advanceTimersByTimeAsync(30_000);
        expect(taskRepo.find).toHaveBeenCalledTimes(2);
        (service as any).running = false;

        service.onModuleDestroy();
        service.onModuleDestroy();
        await jest.advanceTimersByTimeAsync(30_000);
        expect(taskRepo.find).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
