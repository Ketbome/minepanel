import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface VersionInfo {
  current: string | null;
  latest: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  publishedAt: string | null;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
}

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);
  private readonly RELEASES_URL = 'https://api.github.com/repos/Ketbome/minepanel/releases/latest';
  // GitHub allows 60 unauthenticated calls per hour and per IP, shared by every
  // panel behind the same address, so the answer is held for an hour.
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  private cache?: { release: GithubRelease | null; expiresAt: number };

  async getVersionInfo(): Promise<VersionInfo> {
    const current = this.getCurrentVersion();
    const release = await this.getLatestRelease();
    const latest = release ? release.tag_name.replace(/^v/, '') : null;

    return {
      current,
      latest,
      updateAvailable: this.isNewer(latest, current),
      releaseUrl: release?.html_url ?? null,
      publishedAt: release?.published_at ?? null,
    };
  }

  // Injected at build time. A local run has no version, and comparing against a
  // release would only produce a false update notice.
  private getCurrentVersion(): string | null {
    const version = (process.env.APP_VERSION ?? '').trim();
    return version && version !== 'dev' ? version : null;
  }

  private async getLatestRelease(): Promise<GithubRelease | null> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.release;
    }

    try {
      const response = await axios.get<GithubRelease>(this.RELEASES_URL, {
        timeout: 5000,
        headers: { Accept: 'application/vnd.github+json' },
      });
      this.cache = { release: response.data, expiresAt: Date.now() + this.CACHE_TTL_MS };
    } catch (error) {
      this.logger.warn(`Could not check for updates: ${error instanceof Error ? error.message : error}`);
      // Cached as a miss too, so an unreachable GitHub is not retried on every request.
      this.cache = { release: null, expiresAt: Date.now() + this.CACHE_TTL_MS };
    }

    return this.cache.release;
  }

  private isNewer(latest: string | null, current: string | null): boolean {
    if (!latest || !current) return false;

    const toParts = (value: string) => value.split('.').map((part) => Number.parseInt(part, 10) || 0);
    const latestParts = toParts(latest);
    const currentParts = toParts(current);

    for (let index = 0; index < Math.max(latestParts.length, currentParts.length); index += 1) {
      const left = latestParts[index] ?? 0;
      const right = currentParts[index] ?? 0;
      if (left !== right) return left > right;
    }

    return false;
  }
}
