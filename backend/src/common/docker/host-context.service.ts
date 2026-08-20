import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface HostContext {
  /** Compose project the panel belongs to, e.g. "minepanel". */
  project?: string;
  /** Directory the panel's compose command was run from, on the host. */
  workingDir?: string;
  /** Compose files the panel was started with, in order, as host paths. */
  configFiles: string[];
  /** The panel's own service name: "backend" in the split stack, "minepanel" in the single one. */
  service?: string;
}

/**
 * Tells the panel how it was started.
 *
 * Compose stamps this onto every container it creates, so reading the panel's
 * own labels beats hard-coding it: the same code then works for the split stack,
 * the all-in-one image and any renamed project.
 */
@Injectable()
export class HostContextService {
  private readonly logger = new Logger(HostContextService.name);
  private cached?: HostContext;

  async get(): Promise<HostContext> {
    if (!this.cached) {
      this.cached = await this.inspectSelf();
    }
    return this.cached;
  }

  private async inspectSelf(): Promise<HostContext> {
    // Docker sets HOSTNAME to the short container id unless the compose file
    // overrides it, which none of the shipped ones do.
    const containerId = process.env.HOSTNAME?.trim();
    if (!containerId) {
      this.logger.warn('No container id in HOSTNAME; the panel is probably not running in Docker');
      return { configFiles: [] };
    }

    try {
      const format = '{{json .Config.Labels}}';
      const { stdout } = await execAsync(`docker inspect --format '${format}' ${containerId}`);
      const labels = JSON.parse(stdout.trim() || '{}') as Record<string, string>;

      return {
        project: labels['com.docker.compose.project'] || undefined,
        workingDir: labels['com.docker.compose.project.working_dir'] || undefined,
        configFiles: this.parseConfigFiles(labels['com.docker.compose.project.config_files']),
        service: labels['com.docker.compose.service'] || undefined,
      };
    } catch (error) {
      // Not fatal: callers fall back to their own defaults and say so.
      this.logger.warn(`Could not inspect the panel's own container (${containerId})`, error);
      return { configFiles: [] };
    }
  }

  private parseConfigFiles(value?: string): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}
