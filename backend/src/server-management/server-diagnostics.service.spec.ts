import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { ServerDiagnosticsService } from './server-diagnostics.service';

describe('ServerDiagnosticsService', () => {
  let tempDir: string;
  let management: { getServerStatus: jest.Mock; getServerLogs: jest.Mock };
  let service: ServerDiagnosticsService;
  const reports = () => path.join(tempDir, 'srv', 'mc-data', 'crash-reports');

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-diagnosis-'));
    management = {
      getServerStatus: jest.fn().mockResolvedValue('stopped'),
      getServerLogs: jest.fn().mockResolvedValue({ logs: '>....\x1b[K[20:00:00] [main/ERROR]: java.lang.OutOfMemoryError: Java heap space\nok' }),
    };
    service = new ServerDiagnosticsService({ get: () => tempDir } as any, management as any);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('reads the log tail and the newest crash report', async () => {
    await fs.ensureDir(reports());
    await fs.writeFile(path.join(reports(), 'crash-old.txt'), 'nothing');
    await fs.utimes(path.join(reports(), 'crash-old.txt'), new Date(1000), new Date(1000));
    await fs.writeFile(path.join(reports(), 'crash-new.txt'), 'Mod File: /data/mods/oculus-1.7.jar\nAttempted to load class net/minecraft/client/Minecraft for invalid dist DEDICATED_SERVER');
    await fs.ensureDir(path.join(reports(), 'folder.txt'));

    const result = await service.diagnose('srv');

    expect(management.getServerLogs).toHaveBeenCalledWith('srv', 400);
    expect(result.status).toBe('stopped');
    expect(result.problems.map((problem) => problem.kind)).toEqual(['out_of_memory', 'client_only_mod']);
    expect(result.problems[1].mods).toEqual(['oculus-1.7.jar']);
    expect(result.errorLines).toEqual(['[20:00:00] [main/ERROR]: java.lang.OutOfMemoryError: Java heap space']);
    expect(result.crashReport).toMatchObject({ file: 'crash-new.txt', excerpt: expect.stringContaining('invalid dist') });
    expect(result.logTail).not.toContain('\x1b');
  });

  it('works without crash reports, logs or a valid id', async () => {
    management.getServerLogs.mockResolvedValue({});
    expect(await service.diagnose('srv')).toMatchObject({ problems: [], errorLines: [], crashReport: null });

    await fs.ensureDir(reports());
    expect((await service.diagnose('srv')).crashReport).toBeNull();
    expect((await service.diagnose('../x')).crashReport).toBeNull();
  });

  it('refuses a crash-reports link out of mc-data', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-outside-'));
    await fs.writeFile(path.join(outside, 'crash.txt'), 'secret');
    await fs.ensureDir(path.join(tempDir, 'srv', 'mc-data'));
    await fs.symlink(outside, reports());

    expect((await service.diagnose('srv')).crashReport).toBeNull();
    await fs.remove(outside);
  });
});
