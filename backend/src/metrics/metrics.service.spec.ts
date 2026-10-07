import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { MetricSample } from './entities/metric-sample.entity';
import { UptimeSample } from './entities/uptime-sample.entity';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { AlertsService } from 'src/alerts/alerts.service';
import { parseCpuPercent, parseMemoryToMb } from './metric-parse.util';

describe('MetricsService', () => {
  let service: MetricsService;
  let sampleRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let uptimeRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let serverManagement: { getAllServersRuntimeStats: jest.Mock; getCrashInfo: jest.Mock };
  let alertsService: { evaluate: jest.Mock; isExpectedStop: jest.Mock };

  beforeEach(async () => {
    sampleRepo = {
      find: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    uptimeRepo = { find: jest.fn().mockResolvedValue([]), create: jest.fn((x) => x), save: jest.fn(async (x) => x), delete: jest.fn().mockResolvedValue(undefined) };
    serverManagement = { getAllServersRuntimeStats: jest.fn(), getCrashInfo: jest.fn().mockResolvedValue(null) };
    alertsService = { evaluate: jest.fn().mockResolvedValue(undefined), isExpectedStop: jest.fn().mockReturnValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: getRepositoryToken(MetricSample), useValue: sampleRepo },
        { provide: getRepositoryToken(UptimeSample), useValue: uptimeRepo },
        { provide: ServerManagementService, useValue: serverManagement },
        { provide: AlertsService, useValue: alertsService },
        { provide: MonitoringService, useValue: { getSnapshot: jest.fn().mockResolvedValue({ tps: 19.5, msptMedian: 30, msptP95: 60, playersOnline: 3 }) } },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  describe('parseCpuPercent', () => {
    it.each([
      ['12.5%', 12.5],
      ['0%', 0],
      ['N/A', null],
      ['', null],
      ['abc', null],
    ])('should parse %s to %s', (input, expected) => {
      expect(parseCpuPercent(input)).toBe(expected);
    });
  });

  describe('parseMemoryToMb', () => {
    it.each([
      ['512MiB', 512],
      ['256MB', 256],
      ['1.5GiB', 1536],
      ['1024KiB', 1],
      ['N/A', null],
      ['bad', null],
      ['10PiB', null],
    ])('should parse %s to %s', (input, expected) => {
      expect(parseMemoryToMb(input)).toBe(expected);
    });
  });

  describe('getHistory', () => {
    it('should map stored samples to metric points with ISO timestamps', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      sampleRepo.find.mockResolvedValue([{ cpuPercent: 10, memoryMb: 512, memoryLimitMb: 1024, createdAt }]);

      const result = await service.getHistory('srv', 24);

      expect(result).toEqual([
        { cpuPercent: 10, memoryMb: 512, memoryLimitMb: 1024, tps: null, tickSource: null, msptMean: null, msptMedian: null, msptP95: null, playersOnline: null, timestamp: '2026-01-01T00:00:00.000Z' },
      ]);
    });
  });

  describe('getUptime', () => {
    it('should return windows, 30 daily buckets and incidents', async () => {
      const result = await service.getUptime('srv');
      expect(result.windows.map((w) => w.hours)).toEqual([24, 168, 720]);
      expect(result.windows[0].uptimePercent).toBeNull();
      expect(result.daily).toHaveLength(30);
      expect(result.incidents).toEqual([]);
    });
  });

  describe('collectSamples', () => {
    it('should record availability for every known server, running or not', async () => {
      serverManagement.getAllServersRuntimeStats.mockResolvedValue({
        a: { status: 'running', cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A' },
        b: { status: 'stopped' },
        c: { status: 'not_found' },
      });
      await (service as any).collectSamples();
      // b was never seen running, so its stop is not counted either.
      expect(uptimeRepo.save.mock.calls[0][0].map((u) => [u.serverId, u.running])).toEqual([['a', true]]);
      expect(uptimeRepo.delete).toHaveBeenCalled();
    });

    it('counts an unplanned stop as downtime but not a stop the panel asked for', async () => {
      const stats = (status: string) => ({ a: { status }, b: { status } });
      serverManagement.getAllServersRuntimeStats.mockResolvedValue(stats('running'));
      await (service as any).collectSamples();
      alertsService.isExpectedStop.mockImplementation((id: string) => id === 'b');
      serverManagement.getAllServersRuntimeStats.mockResolvedValue(stats('stopped'));
      uptimeRepo.save.mockClear();
      await (service as any).collectSamples();
      await (service as any).collectSamples();
      expect(uptimeRepo.save.mock.calls.flatMap((c) => c[0]).map((u) => [u.serverId, u.running])).toEqual([['a', false], ['a', false]]);
    });

    it('should only persist samples for running servers with parseable usage', async () => {
      serverManagement.getAllServersRuntimeStats.mockResolvedValue({
        srvA: { status: 'running', cpuUsage: '10%', memoryUsage: '512MiB', memoryLimit: '1GiB' },
        srvB: { status: 'exited', cpuUsage: '5%', memoryUsage: '256MiB', memoryLimit: '1GiB' },
        srvC: { status: 'running', cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A' },
      });

      await (service as any).collectSamples();

      expect(sampleRepo.save).toHaveBeenCalledTimes(1);
      const saved = sampleRepo.save.mock.calls[0][0];
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ serverId: 'srvA', cpuPercent: 10, memoryMb: 512, memoryLimitMb: 1024, tps: 19.5, msptMedian: 30, msptP95: 60, playersOnline: 3 });
    });

    it('should not save when no running server has parseable usage', async () => {
      serverManagement.getAllServersRuntimeStats.mockResolvedValue({
        srvC: { status: 'running', cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A' },
      });

      await (service as any).collectSamples();

      expect(sampleRepo.save).not.toHaveBeenCalled();
    });

    it('should pass resources to the alerts service', async () => {
      const resources = {
        srvA: { status: 'running', cpuUsage: '10%', memoryUsage: '512MiB', memoryLimit: '1GiB' },
      };
      serverManagement.getAllServersRuntimeStats.mockResolvedValue(resources);

      await (service as any).collectSamples();

      expect(alertsService.evaluate).toHaveBeenCalledWith(resources, expect.any(Function));
      await alertsService.evaluate.mock.calls[0][1]('srvA');
      expect(serverManagement.getCrashInfo).toHaveBeenCalledWith('srvA');
    });

    it('should still persist samples when alert evaluation fails', async () => {
      alertsService.evaluate.mockRejectedValue(new Error('boom'));
      serverManagement.getAllServersRuntimeStats.mockResolvedValue({
        srvA: { status: 'running', cpuUsage: '10%', memoryUsage: '512MiB', memoryLimit: '1GiB' },
      });

      await (service as any).collectSamples();

      expect(sampleRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
