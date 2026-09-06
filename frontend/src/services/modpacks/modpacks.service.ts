import api from "../axios.service";

export type ModpackLoader = "FORGE" | "NEOFORGE" | "FABRIC" | "QUILT";

/**
 * How the archive has to be handed to the server image:
 * - `curseforge-client`: CurseForge client pack -> AUTO_CURSEFORGE with the file method
 * - `modrinth`: Modrinth pack -> MODRINTH server type
 * - `server-pack`: ready-to-run server pack -> CURSEFORGE (CF_SERVER_MOD)
 * - `generic`: mods and configs with no loader -> loader server type + GENERIC_PACK
 */
export type ModpackKind = "curseforge-client" | "modrinth" | "server-pack" | "generic";

export interface ModpackInspection {
  kind: ModpackKind;
  name?: string;
  minecraftVersion?: string;
  loader?: ModpackLoader;
  loaderVersion?: string;
  hasStartScript: boolean;
  hasMods: boolean;
  needsLoader: boolean;
}

export interface ModpackFile {
  name: string;
  size: number;
  modified: string;
  containerPath: string;
}

export interface UploadedModpackFile extends ModpackFile {
  inspection: ModpackInspection;
}

/**
 * - `client` / `server` / `both`: the jar declares it (Fabric and Quilt only)
 * - `known-client`: undeclared, but the mod is on the known client-only list
 * - `unknown`: nothing to go on; Forge and NeoForge keep the side in bytecode
 */
export type ModSide = "client" | "server" | "both" | "known-client" | "unknown";

export interface ModJarInfo {
  entry: string;
  fileName: string;
  size: number;
  modId?: string;
  name?: string;
  loader?: ModpackLoader;
  side: ModSide;
}

export interface ModpackModScan {
  mods: ModJarInfo[];
  truncated: boolean;
}

export const modpacksService = {
  async list(serverId: string): Promise<ModpackFile[]> {
    const { data } = await api.get(`/servers/${serverId}/modpacks`);
    return data;
  },

  async upload(serverId: string, file: File, onProgress?: (percentage: number) => void): Promise<UploadedModpackFile> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post(`/servers/${serverId}/modpacks`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });

    return data;
  },

  async inspect(serverId: string, fileName: string): Promise<ModpackInspection> {
    const { data } = await api.get(`/servers/${serverId}/modpacks/${encodeURIComponent(fileName)}/inspect`);
    return data;
  },

  async scanMods(serverId: string, fileName: string): Promise<ModpackModScan> {
    const { data } = await api.get(`/servers/${serverId}/modpacks/${encodeURIComponent(fileName)}/mods`);
    return data;
  },

  async stripMods(serverId: string, fileName: string, entries: string[]): Promise<UploadedModpackFile> {
    const { data } = await api.post(`/servers/${serverId}/modpacks/${encodeURIComponent(fileName)}/strip`, { entries });
    return data;
  },

  async remove(serverId: string, fileName: string): Promise<void> {
    await api.delete(`/servers/${serverId}/modpacks/${encodeURIComponent(fileName)}`);
  },
};
