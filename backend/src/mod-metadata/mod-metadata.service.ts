import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { ModEntry, ModProvider, findModEntryIndex, parseModEntries, serializeModEntries } from './mod-entries.util';

export interface PendingModChange {
  provider: ModProvider;
  ref: string;
  action: 'add' | 'remove';
  version?: string;
  label: string;
}

export interface ModMetadataRecord {
  desiredMcVersion: string | null;
  notes: Record<string, string>;
  pendingChanges: PendingModChange[];
}

const DEFAULT_METADATA: ModMetadataRecord = { desiredMcVersion: null, notes: {}, pendingChanges: [] };

@Injectable()
export class ModMetadataService {
  private readonly logger = new Logger(ModMetadataService.name);
  private readonly SERVERS_DIR: string;

  // Serializes read-modify-write metadata operations per server, so e.g.
  // toggling several mods in quick succession can't have one request's write
  // clobber another's based on a stale read.
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly configService: ConfigService) {
    this.SERVERS_DIR = this.configService.get<string>('serversDir');
    fs.ensureDirSync(this.SERVERS_DIR);
  }

  async getMetadata(serverId: string): Promise<ModMetadataRecord> {
    await this.ensureServerDirectory(serverId);
    return this.readMetadata(serverId);
  }

  async setDesiredVersion(serverId: string, desiredMcVersion: string | null): Promise<ModMetadataRecord> {
    await this.ensureServerDirectory(serverId);
    return this.withLock(serverId, async () => {
      const data = await this.readMetadata(serverId);
      const trimmed = desiredMcVersion?.trim();
      data.desiredMcVersion = trimmed ? trimmed : null;
      await this.writeMetadata(serverId, data);
      return data;
    });
  }

  async setModNote(serverId: string, ref: string, note: string): Promise<ModMetadataRecord> {
    await this.ensureServerDirectory(serverId);
    const key = ref.trim().toLowerCase();
    if (!key) {
      throw new BadRequestException('Mod ref is required');
    }

    return this.withLock(serverId, async () => {
      const data = await this.readMetadata(serverId);
      const trimmed = note.trim();
      if (trimmed) {
        data.notes[key] = trimmed;
      } else {
        delete data.notes[key];
      }
      await this.writeMetadata(serverId, data);
      return data;
    });
  }

  async queueChange(serverId: string, change: PendingModChange): Promise<ModMetadataRecord> {
    await this.ensureServerDirectory(serverId);
    const ref = change.ref.trim();
    if (!ref) {
      throw new BadRequestException('Mod ref is required');
    }

    return this.withLock(serverId, async () => {
      const data = await this.readMetadata(serverId);
      const key = ref.toLowerCase();
      data.pendingChanges = [
        ...data.pendingChanges.filter((existing) => !(existing.provider === change.provider && existing.ref.toLowerCase() === key)),
        { ...change, ref },
      ];
      await this.writeMetadata(serverId, data);
      return data;
    });
  }

  async cancelQueuedChange(serverId: string, provider: ModProvider, ref: string): Promise<ModMetadataRecord> {
    await this.ensureServerDirectory(serverId);
    const key = ref.trim().toLowerCase();
    return this.withLock(serverId, async () => {
      const data = await this.readMetadata(serverId);
      data.pendingChanges = data.pendingChanges.filter((existing) => !(existing.provider === provider && existing.ref.toLowerCase() === key));
      await this.writeMetadata(serverId, data);
      return data;
    });
  }

  // Non-destructive: returns the current queue without clearing it, so the
  // caller can only clear the entries it actually managed to apply (see
  // acknowledgeQueue). Only the start/restart lifecycle should call this.
  async peekPendingQueue(serverId: string): Promise<PendingModChange[]> {
    const data = await this.readMetadata(serverId);
    return data.pendingChanges;
  }

  // Removes only the given changes from the queue, matched by provider+ref+action+version,
  // so changes queued concurrently while the caller was applying `applied` are preserved
  // rather than wiped out along with it. Version is part of the identity: if the queue was
  // re-armed with a newer version for the same ref while `applied` (an older version) was
  // being processed, acknowledging `applied` must not remove that newer entry.
  async acknowledgeQueue(serverId: string, applied: PendingModChange[]): Promise<void> {
    if (applied.length === 0) return;
    const appliedKeys = new Set(applied.map((change) => this.changeIdentity(change)));

    await this.withLock(serverId, async () => {
      const data = await this.readMetadata(serverId);
      data.pendingChanges = data.pendingChanges.filter((change) => !appliedKeys.has(this.changeIdentity(change)));
      await this.writeMetadata(serverId, data);
    });
  }

  private changeIdentity(change: PendingModChange): string {
    return `${change.provider}:${change.action}:${change.ref.toLowerCase()}:${change.version ?? ''}`;
  }

  private withLock<T>(serverId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(serverId) ?? Promise.resolve();
    const run = previous.then(() => fn());
    // Tail promise never rejects, so a failed operation doesn't wedge the next one queued behind it.
    this.locks.set(
      serverId,
      run.then(
        () => undefined,
        () => undefined,
      ),
    );
    return run;
  }

  applyQueueToConfig(cfFiles: string, modrinthProjects: string, queue: PendingModChange[]): { cfFiles: string; modrinthProjects: string } {
    const fields: Record<ModProvider, { value: string; provider: ModProvider }> = {
      curseforge: { value: cfFiles, provider: 'curseforge' },
      modrinth: { value: modrinthProjects, provider: 'modrinth' },
    };

    for (const provider of Object.keys(fields) as ModProvider[]) {
      const relevant = queue.filter((change) => change.provider === provider);
      if (relevant.length === 0) continue;

      let entries: ModEntry[] = parseModEntries(fields[provider].value, provider);
      for (const change of relevant) {
        const index = findModEntryIndex(entries, [change.ref]);
        if (change.action === 'remove') {
          if (index >= 0) entries = entries.filter((_, entryIndex) => entryIndex !== index);
          continue;
        }

        if (index >= 0) {
          // Update ref/version only, so loader prefix, the `?` optional marker,
          // and opaque refs survive the round-trip (see mod-entries.util.ts).
          entries = entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ref: change.ref, version: change.version } : entry));
        } else {
          const nextEntry: ModEntry = { raw: change.ref, ref: change.ref, version: change.version, separator: ':', optional: false, opaque: false };
          entries = [...entries, nextEntry];
        }
      }

      fields[provider].value = serializeModEntries(entries);
    }

    return { cfFiles: fields.curseforge.value, modrinthProjects: fields.modrinth.value };
  }

  private async readMetadata(serverId: string): Promise<ModMetadataRecord> {
    const metadataPath = this.getMetadataPath(serverId);
    if (!(await fs.pathExists(metadataPath))) {
      return { ...DEFAULT_METADATA, notes: {}, pendingChanges: [] };
    }

    try {
      const content = await fs.readJson(metadataPath);
      return {
        desiredMcVersion: typeof content?.desiredMcVersion === 'string' ? content.desiredMcVersion : null,
        notes: content?.notes && typeof content.notes === 'object' ? content.notes : {},
        pendingChanges: Array.isArray(content?.pendingChanges) ? content.pendingChanges : [],
      };
    } catch (error) {
      this.logger.error(`Failed to read mod metadata for server ${serverId}, falling back to defaults`, error as Error);
      return { ...DEFAULT_METADATA, notes: {}, pendingChanges: [] };
    }
  }

  private async writeMetadata(serverId: string, data: ModMetadataRecord) {
    await fs.writeJson(this.getMetadataPath(serverId), data, { spaces: 2 });
  }

  private async ensureServerDirectory(serverId: string) {
    this.validateServerId(serverId);
    const serverPath = this.getServerPath(serverId);
    if (!(await fs.pathExists(serverPath))) {
      throw new NotFoundException('Server not found');
    }
  }

  private validateServerId(serverId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }
  }

  private getServerPath(serverId: string) {
    return path.join(this.SERVERS_DIR, serverId);
  }

  private getMetadataPath(serverId: string) {
    return path.join(this.getServerPath(serverId), 'mod-metadata.json');
  }
}
