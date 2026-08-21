import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ReleaseChange {
  /** The change itself, with the "by @author in <url>" tail and markdown removed. */
  text: string;
  author: string | null;
  pr: number | null;
  prUrl: string | null;
}

export interface ReleaseSection {
  /** Category from .github/release.yml, e.g. "🐛 Bug Fixes". Empty when the notes list changes without one. */
  title: string;
  /** Something to read or do before updating, not just a list of what changed. */
  important: boolean;
  changes: ReleaseChange[];
}

export interface ReleaseNote {
  version: string;
  url: string;
  publishedAt: string;
  /** The listed changes, grouped the way the release notes group them. */
  sections: ReleaseSection[];
  /** Whatever did not parse into a section, so hand-written notes are not dropped. */
  notes: string;
  /** GitHub's "Full Changelog" compare link, when the notes carry one. */
  compareUrl: string | null;
  breaking: boolean;
}

export interface VersionInfo {
  current: string | null;
  latest: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  publishedAt: string | null;
  /** Releases newer than the running one, newest first. */
  changelog: ReleaseNote[];
  /** True when any of those releases changes behaviour in a way that needs attention. */
  hasBreakingChanges: boolean;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
  body?: string;
  prerelease?: boolean;
  draft?: boolean;
}

// Matches the "Breaking Changes" category configured in .github/release.yml.
const BREAKING_HEADING = /^#{1,4}\s*.*breaking changes/im;
// The release workflow opens every body with the image tags to pull; the panel
// prints its own update instructions instead, so that block is dropped.
const DOCKER_HEADING = /docker images/i;
// GitHub's wrapper around the generated categories, not a category itself.
const WHATS_CHANGED = /what'?s changed/i;
// Categories the user has to act on rather than just read: what breaks, and
// what the release expects them to edit in compose or .env by hand. The panel
// lifts these above the changelog, where they are seen before updating.
const ACTION_HEADING = /breaking changes|manual steps?|action required|upgrade notes/i;

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);
  private readonly RELEASES_URL = 'https://api.github.com/repos/Ketbome/minepanel/releases?per_page=30';
  // GitHub allows 60 unauthenticated calls per hour and per IP, shared by every
  // panel behind the same address, so the answer is held for an hour.
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  private cache?: { releases: GithubRelease[]; expiresAt: number };

  async getVersionInfo(): Promise<VersionInfo> {
    const current = this.getCurrentVersion();
    const releases = await this.getReleases();
    const newest = releases[0];
    const latest = newest ? this.toVersion(newest) : null;
    const changelog = this.buildChangelog(releases, current);

    return {
      current,
      latest,
      updateAvailable: this.isNewer(latest, current),
      releaseUrl: newest?.html_url ?? null,
      publishedAt: newest?.published_at ?? null,
      changelog,
      hasBreakingChanges: changelog.some((entry) => entry.breaking),
    };
  }

  // Injected at build time. A local run has no version, and comparing against a
  // release would only produce a false update notice.
  getCurrentVersion(): string | null {
    const version = (process.env.APP_VERSION ?? '').trim();
    return version && version !== 'dev' ? version : null;
  }

  private toVersion(release: GithubRelease): string {
    return release.tag_name.replace(/^v/, '');
  }

  /**
   * Everything published between the running version and the newest one, so a
   * panel several releases behind still sees what it is about to pick up.
   */
  private buildChangelog(releases: GithubRelease[], current: string | null): ReleaseNote[] {
    if (!current) return [];

    return releases
      .filter((release) => !release.draft && !release.prerelease)
      .filter((release) => this.isNewer(this.toVersion(release), current))
      .map((release) => {
        const version = this.toVersion(release);
        const body = release.body?.trim() ?? '';
        const { sections, notes, compareUrl } = this.parseBody(body);
        return {
          version,
          url: release.html_url,
          publishedAt: release.published_at,
          sections,
          notes,
          compareUrl,
          breaking: this.isBreaking(version, current, body),
        };
      })
      .sort((a, b) => this.compare(b.version, a.version));
  }

  /**
   * Turns a release body into the changes it lists.
   *
   * The panel renders the changelog itself rather than printing markdown at the
   * user, so the body is read once here: categories become sections, bullets
   * become changes, and the parts the panel replaces (the image-pull preamble,
   * the compare link) are pulled out instead of shown twice.
   */
  private parseBody(body: string): { sections: ReleaseSection[]; notes: string; compareUrl: string | null } {
    const sections: ReleaseSection[] = [];
    const leftover: string[] = [];
    let compareUrl: string | null = null;
    let current: ReleaseSection | null = null;
    // The image-pull preamble, whose lines are dropped until the next heading.
    let skipping = false;
    let inFence = false;

    for (const raw of body.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      // A collapsed category (release.yml's `collapse: true`) is a <summary>
      // rather than a heading, but it means the same thing.
      const title = /^#{2,4}\s+(.*)$/.exec(line)?.[1] ?? /^<summary>(.*)<\/summary>$/.exec(line)?.[1];
      if (title !== undefined) {
        skipping = DOCKER_HEADING.test(title);
        current =
          skipping || WHATS_CHANGED.test(title)
            ? null
            : { title: this.stripMarkdown(title), important: ACTION_HEADING.test(title), changes: [] };
        if (current) sections.push(current);
        continue;
      }

      const compare = /^\*\*Full Changelog\*\*:\s*(\S+)/i.exec(line);
      if (compare) {
        compareUrl = compare[1];
        continue;
      }

      if (skipping) continue;
      if (line.startsWith('<details') || line.startsWith('</details')) continue;

      const bullet = /^[*-]\s+(.*)$/.exec(line)?.[1];
      if (bullet) {
        if (!current) {
          current = { title: '', important: false, changes: [] };
          sections.push(current);
        }
        current.changes.push(this.parseChange(bullet));
        continue;
      }

      leftover.push(line);
    }

    return {
      sections: sections.filter((section) => section.changes.length > 0),
      notes: leftover.join('\n').trim(),
      compareUrl,
    };
  }

  // Generated entries read "<title> by @<author> in <pull request url>".
  private parseChange(entry: string): ReleaseChange {
    const match = /^(.*?)\s+by\s+@([\w-]+)\s+in\s+(\S+)$/.exec(entry);
    const prUrl = match?.[3] ?? null;
    const pr = Number.parseInt(/\/pull\/(\d+)/.exec(prUrl ?? '')?.[1] ?? '', 10);

    return {
      text: this.stripMarkdown(match?.[1] ?? entry),
      author: match?.[2] ?? null,
      pr: Number.isNaN(pr) ? null : pr,
      prUrl,
    };
  }

  private stripMarkdown(value: string): string {
    return value
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .trim();
  }

  // Either the release notes carry the breaking-changes section, or the major
  // version moved, which is what a major bump is for.
  private isBreaking(version: string, current: string, notes: string): boolean {
    if (BREAKING_HEADING.test(notes)) return true;
    return this.majorOf(version) > this.majorOf(current);
  }

  private majorOf(version: string): number {
    return Number.parseInt(version.split('.')[0], 10) || 0;
  }

  private async getReleases(): Promise<GithubRelease[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.releases;
    }

    try {
      const response = await axios.get<GithubRelease[]>(this.RELEASES_URL, {
        timeout: 5000,
        headers: { Accept: 'application/vnd.github+json' },
      });
      const releases = Array.isArray(response.data) ? response.data : [];
      this.cache = { releases, expiresAt: Date.now() + this.CACHE_TTL_MS };
    } catch (error) {
      this.logger.warn(`Could not check for updates: ${error instanceof Error ? error.message : error}`);
      // Cached as a miss too, so an unreachable GitHub is not retried on every request.
      this.cache = { releases: [], expiresAt: Date.now() + this.CACHE_TTL_MS };
    }

    return this.cache.releases;
  }

  private isNewer(latest: string | null, current: string | null): boolean {
    if (!latest || !current) return false;
    return this.compare(latest, current) > 0;
  }

  /**
   * Compares release versions. A prerelease suffix ranks below the same numbers
   * without one, so 2.0.0-rc1 does not read as newer than 2.0.0.
   */
  private compare(left: string, right: string): number {
    const split = (value: string) => {
      const [numbers, suffix] = value.split('-', 2);
      return {
        parts: numbers.split('.').map((part) => Number.parseInt(part, 10) || 0),
        suffix: suffix ?? '',
      };
    };

    const a = split(left);
    const b = split(right);

    for (let index = 0; index < Math.max(a.parts.length, b.parts.length); index += 1) {
      const difference = (a.parts[index] ?? 0) - (b.parts[index] ?? 0);
      if (difference !== 0) return difference > 0 ? 1 : -1;
    }

    if (a.suffix === b.suffix) return 0;
    if (!a.suffix) return 1;
    if (!b.suffix) return -1;
    return a.suffix > b.suffix ? 1 : -1;
  }
}
