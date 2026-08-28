import * as os from 'node:os';
import { SystemMonitoringService } from './system-monitoring.service';

jest.mock('node:util', () => {
  const execMock = jest.fn();
  return { ...jest.requireActual('node:util'), promisify: () => execMock };
});

const mockExec = jest.requireMock('node:util').promisify();

const cpu = (idle: number, user: number) => ({ model: 'Test CPU', speed: 1, times: { user, nice: 0, sys: 0, idle, irq: 0 } });

describe('SystemMonitoringService', () => {
  let service: SystemMonitoringService;
  let settingsRepo: { find: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    settingsRepo = { find: jest.fn().mockResolvedValue([]) };
    service = new SystemMonitoringService({ get: jest.fn() } as any, settingsRepo as any);
    jest.spyOn(os, 'totalmem').mockReturnValue(1000);
    jest.spyOn(os, 'freemem').mockReturnValue(250);
    jest.spyOn(os, 'uptime').mockReturnValue(42);
    jest.spyOn(os, 'hostname').mockReturnValue('panel');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports cpu usage from the delta between two samples', async () => {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    jest.spyOn(os, 'cpus').mockReturnValueOnce([cpu(100, 100)] as any).mockReturnValueOnce([cpu(150, 250)] as any);
    mockExec.mockResolvedValue({ stdout: '/dev/sda1 1000 400 600 40% /\n' });

    const first = await service.getSystemStats();
    const second = await service.getSystemStats();

    expect(first.cpu).toEqual({ usage: 0, cores: 1, model: 'Test CPU' });
    // 50 idle out of 200 total ticks -> 75% busy
    expect(second.cpu.usage).toBe(75);
    expect(second.memory).toEqual({ total: 1000, used: 750, free: 250, usagePercentage: 75 });
    expect(second.disk).toEqual({ total: 1024000, used: 409600, free: 614400, usagePercentage: 40 });
    expect(second.uptime).toBe(42);
    expect(second.platform).toBe('linux');
  });

  it('falls back to zeroed disk stats when df fails', async () => {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    jest.spyOn(os, 'cpus').mockReturnValue([] as any);
    mockExec.mockRejectedValue(new Error('no df'));

    const stats = await service.getSystemStats();

    expect(stats.disk).toEqual({ total: 0, used: 0, free: 0, usagePercentage: 0 });
    expect(stats.cpu).toEqual({ usage: 0, cores: 0, model: 'Unknown' });
  });

  it('parses wmic output on windows', async () => {
    jest.spyOn(os, 'platform').mockReturnValue('win32');
    jest.spyOn(os, 'cpus').mockReturnValue([cpu(1, 1)] as any);
    mockExec.mockResolvedValueOnce({ stdout: '\r\nFreeSpace=400\r\nSize=1000\r\n' });

    const stats = await service.getSystemStats();
    expect(stats.disk).toEqual({ total: 1000, used: 600, free: 400, usagePercentage: 60 });

    mockExec.mockRejectedValueOnce(new Error('no wmic'));
    expect((await service.getSystemStats()).disk.total).toBe(0);
  });

  it('formats bytes', () => {
    expect(service.formatBytes(0)).toBe('0 Bytes');
    expect(service.formatBytes(1536)).toBe('1.5 KB');
    expect(service.formatBytes(5 * 1024 * 1024, -1)).toBe('5 MB');
  });

  it('reads network settings from the first user and validates the LAN ip', async () => {
    settingsRepo.find.mockResolvedValue([{ preferences: { publicIp: ' play.example.com ', lanIp: '192.168.1.10' } }]);
    expect(await service.getNetworkInfo()).toEqual({ hostname: 'panel', localIPs: ['192.168.1.10'], publicIP: 'play.example.com' });

    settingsRepo.find.mockResolvedValue([{ preferences: { publicIp: '  ', lanIp: '999.1.1' } }]);
    expect(await service.getNetworkInfo()).toEqual({ hostname: 'panel', localIPs: [], publicIP: null });

    settingsRepo.find.mockResolvedValue([{ preferences: { lanIp: '10.0.0.999' } }]);
    expect((await service.getNetworkInfo()).localIPs).toEqual([]);

    settingsRepo.find.mockRejectedValue(new Error('db'));
    expect(await service.getNetworkInfo()).toEqual({ hostname: 'panel', localIPs: [], publicIP: null });
  });
});
