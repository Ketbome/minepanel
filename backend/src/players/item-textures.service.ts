import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AdmZip from 'adm-zip';
import axios from 'axios';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const MOJANG_HOSTS = new Set(['piston-meta.mojang.com', 'piston-data.mojang.com', 'launcher.mojang.com', 'launchermeta.mojang.com']);
const TEXTURE_ENTRY = /^assets\/minecraft\/textures\/(item|block)\/([a-z0-9_]+)\.png$/;
export const TEXTURE_VERSION = /^[a-zA-Z0-9._-]{1,32}$/;
export const TEXTURE_ITEM = /^[a-z0-9_]{1,64}$/;

/**
 * Item/block textures are Mojang assets, so they are never shipped with the panel: they are
 * pulled once per game version from the official client jar and cached under data/textures.
 */
@Injectable()
export class ItemTexturesService {
  private readonly logger = new Logger(ItemTexturesService.name);
  private readonly pending = new Map<string, Promise<void>>();

  constructor(private readonly config: ConfigService) {}

  private get root(): string {
    return path.join(path.dirname(this.config.getOrThrow<string>('database.path')), 'textures');
  }

  /** Starts the one-time download for a version in the background; never throws. */
  ensure(version: string): void {
    if (!TEXTURE_VERSION.test(version) || this.pending.has(version)) return;
    const job = this.download(version).catch((error) => {
      this.logger.warn(`Could not fetch textures for ${version}: ${(error as Error).message}`);
      this.pending.delete(version); // allow a retry on the next request
    });
    this.pending.set(version, job);
  }

  /** Path of the best matching PNG, or null. Blocks without a flat item icon fall back to a face texture. */
  async resolve(version: string, item: string): Promise<string | null> {
    if (!TEXTURE_VERSION.test(version) || !TEXTURE_ITEM.test(item)) return null;
    const dir = path.join(this.root, version);
    // Animated items (compass, clock, recovery_compass) only ship numbered frames.
    const candidates = [`item/${item}.png`, `item/${item}_00.png`, `block/${item}.png`, `block/${item}_side.png`, `block/${item}_front.png`, `block/${item}_top.png`];
    for (const candidate of candidates) {
      const file = path.join(dir, candidate);
      if (await fs.stat(file).then((stat) => stat.isFile(), () => false)) return file;
    }
    return null;
  }

  private async download(version: string): Promise<void> {
    const dir = path.join(this.root, version);
    if (await fs.stat(path.join(dir, '.done')).then(() => true, () => false)) return;

    const manifest = await this.getJson<{ versions?: { id: string; url: string }[] }>(MANIFEST_URL);
    const entry = manifest.versions?.find((candidate) => candidate.id === version);
    if (!entry) throw new Error('Unknown Minecraft version');
    const details = await this.getJson<{ downloads?: { client?: { url?: string } } }>(entry.url);
    const clientUrl = details.downloads?.client?.url;
    if (!clientUrl) throw new Error('Version has no client download');
    const jar = await axios.get<ArrayBuffer>(this.mojangUrl(clientUrl), { responseType: 'arraybuffer', timeout: 120_000, maxContentLength: 128 * 1024 * 1024 });

    const staging = `${dir}.tmp-${process.pid}`;
    await fs.rm(staging, { recursive: true, force: true });
    for (const kind of ['item', 'block']) await fs.mkdir(path.join(staging, kind), { recursive: true });
    for (const zipEntry of new AdmZip(Buffer.from(jar.data)).getEntries()) {
      const match = TEXTURE_ENTRY.exec(zipEntry.entryName);
      if (match) await fs.writeFile(path.join(staging, match[1], `${match[2]}.png`), zipEntry.getData());
    }
    await fs.writeFile(path.join(staging, '.done'), new Date().toISOString());
    await fs.rm(dir, { recursive: true, force: true });
    await fs.rename(staging, dir);
    this.logger.log(`Cached item textures for Minecraft ${version}`);
  }

  private async getJson<T>(url: string): Promise<T> {
    return (await axios.get<T>(this.mojangUrl(url), { timeout: 20_000 })).data;
  }

  private mojangUrl(url: string): string {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !MOJANG_HOSTS.has(parsed.hostname)) throw new Error(`Refusing non-Mojang URL ${parsed.hostname}`);
    return parsed.toString();
  }
}
