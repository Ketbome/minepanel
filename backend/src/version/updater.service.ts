import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { HostContextService } from 'src/common/docker/host-context.service';

const execAsync = promisify(exec);

// Small image that already has the compose plugin and curl, so the updater does
// not need to build anything.
const UPDATER_IMAGE = 'docker:27-cli';
const RESULT_FILE = '/app/data/update-result.json';

export interface UpdateResult {
  status: 'running' | 'succeeded' | 'rolled-back' | 'failed';
  startedAt: string;
  finishedAt?: string;
  fromDigests?: Record<string, string>;
  message?: string;
}

export class UpdateNotSupportedError extends Error {}

/**
 * Updates the panel by handing the job to a throwaway container.
 *
 * The panel cannot pull and recreate its own stack: the command dies with the
 * container it is recreating, which is why self-updating was refused before. A
 * separate one-shot container survives that, records the image digests it
 * started from, waits for the panel to answer /health again and rolls back to
 * those digests if it never does.
 */
@Injectable()
export class UpdaterService {
  private readonly logger = new Logger(UpdaterService.name);

  constructor(
    private readonly hostContext: HostContextService,
    private readonly configService: ConfigService,
  ) {}

  async getLastResult(): Promise<UpdateResult | null> {
    try {
      if (!(await fs.pathExists(RESULT_FILE))) return null;
      return (await fs.readJson(RESULT_FILE)) as UpdateResult;
    } catch (error) {
      this.logger.warn('Could not read the last update result', error);
      return null;
    }
  }

  /**
   * Whether this deployment can be updated from the panel at all. A panel not
   * started by compose has no stack to act on.
   */
  async canSelfUpdate(): Promise<boolean> {
    const context = await this.hostContext.get();
    return !!context.workingDir && context.configFiles.length > 0 && !!context.service;
  }

  async start(): Promise<UpdateResult> {
    const context = await this.hostContext.get();
    if (!context.workingDir || context.configFiles.length === 0 || !context.service) {
      throw new UpdateNotSupportedError('The panel was not started by Docker Compose, so it cannot update itself');
    }

    const digests = await this.currentImageDigests(context.project);
    const result: UpdateResult = {
      status: 'running',
      startedAt: new Date().toISOString(),
      fromDigests: digests,
    };
    await fs.outputJson(RESULT_FILE, result, { spaces: 2 });

    const script = this.buildScript(context.configFiles, digests, result.startedAt, context.service);
    // Detached and on the host's compose project directory, so it outlives this
    // container being recreated.
    const command = [
      'docker run -d --rm',
      '-v /var/run/docker.sock:/var/run/docker.sock',
      // Compose records the paths visible to it in container labels. Preserve
      // the host path so later updates can resolve the project directory.
      `--mount ${this.shellQuote(`type=bind,src=${context.workingDir},dst=${context.workingDir}`)}`,
      ...context.configFiles.map((file) => `--mount ${this.shellQuote(`type=bind,src=${file},dst=${file},readonly`)}`),
      // The daemon resolves this path on the host, so the panel's own container
      // path would land the outcome in a directory the panel cannot read, and
      // the update would look stuck at "running" forever.
      `--mount ${this.shellQuote(`type=bind,src=${this.resultHostDir()},dst=/result`)}`,
      `-w ${this.shellQuote(context.workingDir)}`,
      UPDATER_IMAGE,
      `sh -c ${this.shellQuote(script)}`,
    ].join(' ');

    await execAsync(command);
    this.logger.log('Update handed off to the updater container');
    return result;
  }

  // Where /app/data comes from on the host, detected from the panel's own mounts.
  private resultHostDir(): string {
    const detected = this.configService.get<string>('dataHostDir');
    if (detected) return detected;

    // Only reachable with the config module's detection missing. The update
    // still runs, but the daemon resolves this path on the host, where it is
    // not the panel's data directory, so the outcome never makes it back and
    // the panel has to fall back to noticing that its own version moved.
    this.logger.warn('No host path is known for /app/data, so the outcome of this update will not be recorded');
    return path.dirname(RESULT_FILE);
  }

  private buildScript(configFiles: string[], digests: Record<string, string>, startedAt: string, panelService: string): string {
    const fileArgs = configFiles.map((file) => `-f ${this.shellQuote(file)}`).join(' ');
    const compose = `docker compose ${fileArgs}`;
    const healthProbe =
      "const signal = AbortSignal.timeout(10000); require('http').get('http://localhost:8091' + (process.env.BASE_PATH || '') + '/health', { signal }, (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))";
    const health = `${compose} exec -T ${panelService} node -e ${this.shellQuote(healthProbe)}`;
    const rollback = Object.entries(digests)
      .map(([service, digest]) => `docker tag ${this.shellQuote(digest)} "$(${compose} config --images | grep -m1 ${this.shellQuote(service)})" || true`)
      .join('\n');

    return [
      'set -e',
      `write_result() { printf '{"status":"%s","startedAt":"%s","finishedAt":"%s","message":"%s"}\\n' "$1" "${startedAt}" "$(date -Iseconds)" "$2" > /result/update-result.json; }`,
      // Anything that kills the script before it decides (a failed pull, a
      // daemon restart) must still leave an outcome behind: without it the
      // panel keeps reporting an update that is no longer running.
      `trap 'write_result failed "The update stopped before it could finish"' EXIT`,
      `${compose} pull`,
      `${compose} up -d`,
      // Give the new panel time to boot before deciding it failed.
      'ok=0',
      'for i in $(seq 1 60); do',
      `  if ${health} >/dev/null 2>&1; then ok=1; break; fi`,
      '  sleep 5',
      'done',
      'trap - EXIT',
      'if [ "$ok" = "1" ]; then',
      '  write_result succeeded ""',
      'else',
      rollback,
      `  ${compose} up -d || true`,
      '  write_result rolled-back "The new version did not come up, so the previous images were restored"',
      'fi',
    ].join('\n');
  }

  private async currentImageDigests(project?: string): Promise<Record<string, string>> {
    if (!project) return {};

    try {
      const { stdout } = await execAsync(
        `docker ps --filter "label=com.docker.compose.project=${project}" --format "{{.Label \\"com.docker.compose.service\\"}} {{.Label \\"com.docker.compose.image\\"}}"`,
      );

      const digests: Record<string, string> = {};
      for (const line of stdout.trim().split('\n').filter(Boolean)) {
        const [service, image] = line.split(/\s+/, 2);
        if (service && image) digests[service] = image;
      }
      return digests;
    } catch (error) {
      this.logger.warn('Could not record the current image digests, so a rollback will not be possible', error);
      return {};
    }
  }

  private shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
}
