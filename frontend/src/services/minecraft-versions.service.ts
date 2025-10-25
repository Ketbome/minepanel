/**
 * Minecraft Versions Service
 * Fetches Minecraft versions from the official Mojang API
 */

export interface MinecraftVersion {
  id: string; // Version number (e.g., "1.20.4", "1.19.2")
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  url: string; // URL to version details
  time: string; // Release time
  releaseTime: string; // Release time
}

export interface VersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftVersion[];
}

// Cache for versions (1 hour)
let cachedVersions: MinecraftVersion[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const minecraftVersionsService = {
  /**
   * Fetch all Minecraft versions from Mojang API
   */
  async fetchVersions(): Promise<MinecraftVersion[]> {
    // Check cache
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

      // Cache the results
      cachedVersions = data.versions;
      cacheTimestamp = now;

      return data.versions;
    } catch (error) {
      console.error('Error fetching Minecraft versions:', error);

      // Return fallback versions if API fails
      return this.getFallbackVersions();
    }
  },

  /**
   * Get only release versions (stable versions)
   */
  async getReleaseVersions(): Promise<MinecraftVersion[]> {
    const versions = await this.fetchVersions();
    return versions.filter(v => v.type === 'release');
  },

  /**
   * Get latest release version
   */
  async getLatestRelease(): Promise<string> {
    const versions = await this.getReleaseVersions();
    return versions[0]?.id || '1.20.4';
  },

  /**
   * Get versions grouped by type
   */
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

  /**
   * Search versions by query
   */
  async searchVersions(query: string, type?: MinecraftVersion['type']): Promise<MinecraftVersion[]> {
    const versions = await this.fetchVersions();

    return versions.filter(v => {
      const matchesQuery = v.id.toLowerCase().includes(query.toLowerCase());
      const matchesType = !type || v.type === type;
      return matchesQuery && matchesType;
    });
  },

  /**
   * Fallback versions in case API is unavailable
   */
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

  /**
   * Clear cache (useful for manual refresh)
   */
  clearCache(): void {
    cachedVersions = null;
    cacheTimestamp = 0;
  },

  /**
   * Get popular/recommended versions
   */
  getRecommendedVersions(): string[] {
    return ['1.21', '1.20.6', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2'];
  }
};

