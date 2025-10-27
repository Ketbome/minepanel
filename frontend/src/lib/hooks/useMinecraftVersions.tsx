import { useState, useEffect, useCallback } from "react";
import { minecraftVersionsService, MinecraftVersion } from "@/services/minecraft-versions.service";
import { useLanguage } from "./useLanguage";

export interface UseMinecraftVersionsOptions {
  autoFetch?: boolean;
  filterType?: MinecraftVersion["type"];
  limit?: number;
}

export const useMinecraftVersions = (options: UseMinecraftVersionsOptions = {}) => {
  const { autoFetch = true, filterType, limit } = options;
  const { t } = useLanguage();
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [latestRelease, setLatestRelease] = useState<string>("");

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let fetchedVersions: MinecraftVersion[];

      if (filterType === "release") {
        fetchedVersions = await minecraftVersionsService.getReleaseVersions();
      } else if (filterType) {
        const allVersions = await minecraftVersionsService.fetchVersions();
        fetchedVersions = allVersions.filter((v) => v.type === filterType);
      } else {
        fetchedVersions = await minecraftVersionsService.fetchVersions();
      }

      if (limit && limit > 0) {
        fetchedVersions = fetchedVersions.slice(0, limit);
      }

      setVersions(fetchedVersions);

      const latest = await minecraftVersionsService.getLatestRelease();
      setLatestRelease(latest);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("failedToFetchVersions");
      setError(errorMessage);
      console.error("Error fetching versions:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, limit, t]);

  const refresh = useCallback(() => {
    minecraftVersionsService.clearCache();
    fetchVersions();
  }, [fetchVersions]);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        return versions;
      }

      const results = await minecraftVersionsService.searchVersions(query, filterType);
      return results;
    },
    [versions, filterType]
  );

  const getRecommended = useCallback(() => {
    const recommended = minecraftVersionsService.getRecommendedVersions();
    return versions.filter((v) => recommended.includes(v.id));
  }, [versions]);

  useEffect(() => {
    if (autoFetch) {
      fetchVersions();
    }
  }, [autoFetch, fetchVersions]);

  return {
    versions,
    loading,
    error,
    latestRelease,
    fetchVersions,
    refresh,
    search,
    getRecommended,
  };
};
