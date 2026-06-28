import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricSample } from './entities/metric-sample.entity';
import { ServerManagementService } from 'src/server-management/server-management.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let sampleRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let serverManagement: { getAllServersResources: jest.Mock };

  beforeEach(async () => {
    sampleRepo = {
      find: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    serverManagement = { getAllServersResources: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: getRepositoryToken(MetricSample), useValue: sampleRepo },
        { provide: ServerManagementService, useValue: serverManagement },
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
      expect((service as any).parseCpuPercent(input)).toBe(expected);
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
      expect((service as any).parseMemoryToMb(input)).toBe(expected);
    });
  });

  describe('getHistory', () => {
    it('should map stored samples to metric points with ISO timestamps', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      sampleRepo.find.mockResolvedValue([{ cpuPercent: 10, memoryMb: 512, memoryLimitMb: 1024, createdAt }]);

      const result = await service.getHistory('srv', 24);

      expect(result).toEqual([
        { cpuPercent: 10, memoryMb: 512, memoryLimitMb: 1024, timestamp: '2026-01-01T00:00:00.000Z' },
      ]);
    });
  });

  describe('collectSamples', () => {
    it('should only persist samples for running servers with parseable usage', async () => {
      serverManagement.getAllServersResources.mockResolvedValue({
        srvA: { status: 'running', cpuUsage: '10%', memoryUsage: '512MiB', memoryLimit: '1GiB' },
        srvB: { status: 'exited', cpuUsage: '5%', memoryUsage: '256MiB', memoryLimit: '1GiB' },
        srvC: { status: 'running', cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A' },
      });

      await (service as any).collectSamples();

      expect(sampleRepo.save).toHaveBeenCalledTimes(1);
      const saved = sampleRepo.save.mock.calls[0][0];
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ serverId: 'srvA', cpuPercent: 10, memoryMb: 512, memoryLimitMb: 1024 });
    });

    it('should not save when no running server has parseable usage', async () => {
      serverManagement.getAllServersResources.mockResolvedValue({
        srvC: { status: 'running', cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A' },
      });

      await (service as any).collectSamples();

      expect(sampleRepo.save).not.toHaveBeenCalled();
    });
  });
});
