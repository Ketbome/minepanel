import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';

export interface ModMetadataRecord {
  desiredMcVersion: string | null;
  notes: Record<string, string>;
}

const DEFAULT_METADATA: ModMetadataRecord = { desiredMcVersion: null, notes: {} };

@Injectable()
export class ModMetadataService {
  private readonly SERVERS_DIR: string;

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
    const data = await this.readMetadata(serverId);
    const trimmed = desiredMcVersion?.trim();
    data.desiredMcVersion = trimmed ? trimmed : null;
    await this.writeMetadata(serverId, data);
    return data;
  }

  async setModNote(serverId: string, ref: string, note: string): Promise<ModMetadataRecord> {
    await this.ensureServerDirectory(serverId);
    const key = ref.trim().toLowerCase();
    if (!key) {
      throw new BadRequestException('Mod ref is required');
    }

    const data = await this.readMetadata(serverId);
    const trimmed = note.trim();
    if (trimmed) {
      data.notes[key] = trimmed;
    } else {
      delete data.notes[key];
    }
    await this.writeMetadata(serverId, data);
    return data;
  }

  private async readMetadata(serverId: string): Promise<ModMetadataRecord> {
    const metadataPath = this.getMetadataPath(serverId);
    if (!(await fs.pathExists(metadataPath))) {
      return { ...DEFAULT_METADATA, notes: {} };
    }

    try {
      const content = await fs.readJson(metadataPath);
      return {
        desiredMcVersion: typeof content?.desiredMcVersion === 'string' ? content.desiredMcVersion : null,
        notes: content?.notes && typeof content.notes === 'object' ? content.notes : {},
      };
    } catch {
      return { ...DEFAULT_METADATA, notes: {} };
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
