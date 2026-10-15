import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { assertContained } from 'src/common/fs/contained-path';
import { ServerManagementService } from './server-management.service';
import { errorLines, findProblems, stripConsoleCodes } from './server-diagnostics';

const LOG_LINES = 400;
// Crash reports run to megabytes with mod lists; the cause is near the top.
const MAX_CRASH_REPORT_BYTES = 256 * 1024;
const CRASH_EXCERPT_CHARS = 4000;

@Injectable()
export class ServerDiagnosticsService {
  constructor(
    private readonly config: ConfigService,
    private readonly management: ServerManagementService,
  ) {}

  // Why a server fails to start or crashed: known problems in the log tail and the newest
  // crash report, plus the raw error lines for anything the signatures do not know.
  async diagnose(serverId: string) {
    const [status, logs, crash] = await Promise.all([this.management.getServerStatus(serverId), this.management.getServerLogs(serverId, LOG_LINES), this.latestCrashReport(serverId)]);
    const logText = stripConsoleCodes(logs.logs ?? '');
    const crashText = crash?.content ?? '';

    return {
      status,
      problems: findProblems(`${logText}\n${crashText}`),
      errorLines: errorLines(logText),
      crashReport: crash ? { file: crash.file, modified: crash.modified, excerpt: crashText.slice(0, CRASH_EXCERPT_CHARS) } : null,
      logTail: logText.split(/\r?\n/).slice(-40).join('\n'),
    };
  }

  private async latestCrashReport(serverId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) return null;
    const dataDir = path.join(this.config.get('serversDir'), serverId, 'mc-data');
    const dir = path.join(dataDir, 'crash-reports');
    try {
      // The container owns mc-data and could leave crash-reports as a link out of it.
      await assertContained(dataDir, dir);
      const reports = await Promise.all(
        (await fs.readdir(dir))
          .filter((name) => name.endsWith('.txt'))
          .map(async (name) => ({ name, stat: await fs.lstat(path.join(dir, name)) })),
      );
      const newest = reports.filter(({ stat }) => stat.isFile()).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];
      if (!newest) return null;

      const handle = await fs.open(path.join(dir, newest.name), 'r');
      try {
        const buffer = Buffer.alloc(Math.min(newest.stat.size, MAX_CRASH_REPORT_BYTES));
        await fs.read(handle, buffer, 0, buffer.length, 0);
        return { file: newest.name, modified: newest.stat.mtime, content: buffer.toString('utf8') };
      } finally {
        await fs.close(handle);
      }
    } catch {
      return null;
    }
  }
}
