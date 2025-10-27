export interface MinecraftVersion {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  url: string;
  time: string;
  releaseTime: string;
}

export interface VersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftVersion[];
}

let cachedVersions: MinecraftVersion[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000;

export const minecraftVersionsService = {
  async fetchVersions(): Promise<MinecraftVersion[]> {
    const now = Date.now();
    if (cachedVersions && now - cacheTimestamp < CACHE_DURATION) {
      return cachedVersions;
    }

    try {
      const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');

      if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.statusText}`);
      }

      const data: VersionManifest = await response.json();
      cachedVersions = data.versions;
      cacheTimestamp = now;

      return data.versions;
    } catch (error) {
      console.error('Error fetching Minecraft versions:', error);

      return this.getFallbackVersions();
    }
  },

  async getReleaseVersions(): Promise<MinecraftVersion[]> {
    const versions = await this.fetchVersions();
    return versions.filter(v => v.type === 'release');
  },

  async getLatestRelease(): Promise<string> {
    const versions = await this.getReleaseVersions();
    return versions[0]?.id || '1.20.4';
  },

  async getVersionsByType(): Promise<{
    releases: MinecraftVersion[];
    snapshots: MinecraftVersion[];
    oldBeta: MinecraftVersion[];
    oldAlpha: MinecraftVersion[];
  }> {
    const versions = await this.fetchVersions();

    return {
      releases: versions.filter(v => v.type === 'release'),
      snapshots: versions.filter(v => v.type === 'snapshot'),
      oldBeta: versions.filter(v => v.type === 'old_beta'),
      oldAlpha: versions.filter(v => v.type === 'old_alpha'),
    };
  },

  async searchVersions(query: string, type?: MinecraftVersion['type']): Promise<MinecraftVersion[]> {
    const versions = await this.fetchVersions();

    return versions.filter(v => {
      const matchesQuery = v.id.toLowerCase().includes(query.toLowerCase());
      const matchesType = !type || v.type === type;
      return matchesQuery && matchesType;
    });
  },

  getFallbackVersions(): MinecraftVersion[] {
    const fallbackList = [
      '1.21', '1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
      '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
      '1.18.2', '1.18.1', '1.18',
      '1.17.1', '1.17',
      '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16',
      '1.15.2', '1.15.1', '1.15',
      '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14',
      '1.13.2', '1.13.1', '1.13',
      '1.12.2', '1.12.1', '1.12',
      '1.11.2', '1.11', '1.10.2', '1.10', '1.9.4', '1.9', '1.8.9', '1.8', '1.7.10'
    ];

    return fallbackList.map(id => ({
      id,
      type: 'release' as const,
      url: '',
      time: new Date().toISOString(),
      releaseTime: new Date().toISOString(),
    }));
  },

  clearCache(): void {
    cachedVersions = null;
    cacheTimestamp = 0;
  },

  getRecommendedVersions(): string[] {
    return ['1.21', '1.20.6', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2'];
  }
};

