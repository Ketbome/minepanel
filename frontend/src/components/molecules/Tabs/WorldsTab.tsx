import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AvailableWorld, ServerConfig } from "@/lib/types/types";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getServerWorlds, selectServerWorld } from "@/services/docker/fetchs";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { Search } from "lucide-react";

interface WorldsTabProps {
  serverId: string;
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const WorldsTab: FC<WorldsTabProps> = ({ serverId, config, updateConfig }) => {
  const { t } = useLanguage();
  const [worlds, setWorlds] = useState<AvailableWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSource, setSelectedSource] = useState(config.worldSource ?? "");
  const [selectedScope, setSelectedScope] = useState<"local" | "global">(config.worldScope ?? "local");
  const [worldLevelName, setWorldLevelName] = useState(config.worldLevelName || "world");
  const [forceWorldCopy, setForceWorldCopy] = useState(config.forceWorldCopy ?? false);
  const [query, setQuery] = useState("");

  const loadWorlds = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getServerWorlds(serverId);
      setWorlds(response);
    } catch (error) {
      console.error("Error loading worlds:", error);
      mcToast.error(t("worldsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [serverId, t]);

  useEffect(() => {
    loadWorlds();
  }, [loadWorlds]);

  useEffect(() => {
    setSelectedSource(config.worldSource ?? "");
    setSelectedScope(config.worldScope ?? "local");
    setWorldLevelName(config.worldLevelName || "world");
    setForceWorldCopy(config.forceWorldCopy ?? false);
  }, [config.worldSource, config.worldScope, config.worldLevelName, config.forceWorldCopy]);

  const handlePickWorld = (world: AvailableWorld) => {
    setSelectedSource(world.source);
    setSelectedScope(world.scope);
    if (!worldLevelName || worldLevelName === "world") {
      setWorldLevelName(world.defaultLevelName);
    }
  };

  const handleApply = async () => {
    if (!selectedSource) {
      mcToast.error(t("worldSelectRequired"));
      return;
    }

    const trimmedLevelName = worldLevelName.trim();
    if (!trimmedLevelName) {
      mcToast.error(t("worldLevelNameRequired"));
      return;
    }

    setSaving(true);
    try {
      const result = await selectServerWorld(serverId, {
        worldSource: selectedSource,
        worldScope: selectedScope,
        worldLevelName: trimmedLevelName,
        forceWorldCopy,
        restartIfRunning: true,
      });

      updateConfig("worldSource", result.config.worldSource ?? selectedSource);
      updateConfig("worldScope", result.config.worldScope ?? selectedScope);
      updateConfig("worldLevelName", result.config.worldLevelName ?? trimmedLevelName);
      updateConfig("forceWorldCopy", result.config.forceWorldCopy ?? forceWorldCopy);
      updateConfig("cfSetLevelFrom", "");

      mcToast.success(result.restarted ? t("worldAppliedAndRestarted") : t("worldApplied"));
      await loadWorlds();
    } catch (error) {
      console.error("Error applying world selection:", error);
      mcToast.error(t("worldApplyError"));
    } finally {
      setSaving(false);
    }
  };

  // The selected world is never filtered out: hiding what the server is currently
  // running would read as "nothing is selected".
  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return worlds;
    return worlds.filter(
      (world) =>
        world.displayPath.toLowerCase().includes(needle) ||
        (selectedSource === world.source && selectedScope === world.scope),
    );
  }, [worlds, query, selectedSource, selectedScope]);

  const localWorlds = matching.filter((world) => world.scope === "local");
  const globalWorlds = matching.filter((world) => world.scope === "global");
  const localTotal = worlds.filter((world) => world.scope === "local").length;
  const globalTotal = worlds.filter((world) => world.scope === "global").length;
  const globalWorldGroups = globalWorlds.reduce<Record<string, AvailableWorld[]>>((acc, world) => {
    const [groupName, ...rest] = world.displayPath.split("/");
    const key = rest.length > 0 ? groupName : "_root";
    if (!acc[key]) acc[key] = [];
    acc[key].push(world);
    return acc;
  }, {});
  const sortedGlobalGroupNames = Object.keys(globalWorldGroups).sort((a, b) => a.localeCompare(b));

  const getWorldTitle = (world: AvailableWorld, trimPrefix?: string) => {
    if (!trimPrefix) return world.displayPath;
    const prefix = `${trimPrefix}/`;
    if (world.displayPath.startsWith(prefix)) {
      return world.displayPath.slice(prefix.length);
    }
    return world.displayPath;
  };

  const renderWorldList = (sectionWorlds: AvailableWorld[], trimPrefix?: string) => {
    if (loading) {
      return <p className="text-sm text-gray-400">{t("loading")}</p>;
    }

    if (sectionWorlds.length === 0) {
      return <p className="text-sm text-gray-400">{t("worldsEmpty")}</p>;
    }

    return sectionWorlds.map((world) => (
      <button
        key={`${world.scope}:${world.source}`}
        type="button"
        onClick={() => handlePickWorld(world)}
        className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
          selectedSource === world.source && selectedScope === world.scope
            ? "border-emerald-500/70 bg-emerald-900/20"
            : "border-gray-700/60 bg-gray-800/40 hover:border-gray-600"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-gray-100">{getWorldTitle(world, trimPrefix)}</p>
            <p className="text-xs text-gray-400">{world.type === "directory" ? t("worldTypeFolder") : t("worldTypeArchive")}</p>
          </div>
          <div className="flex gap-2">
            {selectedSource === world.source && selectedScope === world.scope && <Badge variant="secondary">{t("selected")}</Badge>}
            <Badge
              variant={world.copied ? "default" : "outline"}
              className={world.copied ? "" : "border-amber-500/70 text-amber-200 bg-amber-900/30"}
            >
              {world.copied ? t("worldCopied") : t("worldNotCopied")}
            </Badge>
          </div>
        </div>
      </button>
    ));
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft">{t("worlds")}</CardTitle>
        <CardDescription className="text-gray-300">{t("worldsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-amber-300 bg-amber-900/20 border border-amber-700/50 rounded-md px-3 py-2">
          {t("worldsRestartNoticeStopped")}
        </div>

        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchWorlds")}
            className="h-11 pl-10 bg-gray-800 border-gray-600/80 text-white font-minecraft tracking-wide focus:border-emerald-500/60"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2 rounded-md border border-gray-700/60 bg-gray-900/30 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-300">{t("worldSourceLocal")}</h4>
              <Badge variant="outline" className="border-blue-500/50 text-blue-300 bg-blue-950/20">{query ? `${localWorlds.length}/${localTotal}` : localTotal}</Badge>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {renderWorldList(localWorlds)}
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-gray-700/60 bg-gray-900/30 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-cyan-300">{t("worldSourceLibrary")}</h4>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 bg-cyan-950/20">{query ? `${globalWorlds.length}/${globalTotal}` : globalTotal}</Badge>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-sm text-gray-400">{t("loading")}</p>
              ) : globalWorlds.length === 0 ? (
                <p className="text-sm text-gray-400">{t("worldsEmpty")}</p>
              ) : (
                <div className="space-y-3">
                  {sortedGlobalGroupNames.map((groupName) => (
                    <div key={groupName} className="rounded-md border border-cyan-900/50 bg-cyan-950/10 p-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                        {groupName === "_root" ? t("worldSourceLibrary") : groupName}
                      </p>
                      <div className="space-y-2">
                        {renderWorldList(globalWorldGroups[groupName], groupName === "_root" ? undefined : groupName)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200" htmlFor="worldLevelName">
              {t("worldLevelName")}
            </label>
            <Input
              id="worldLevelName"
              value={worldLevelName}
              onChange={(e) => setWorldLevelName(e.target.value)}
              placeholder="world"
              className="bg-gray-800 border-gray-600 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200" htmlFor="forceWorldCopy">
              {t("forceWorldCopy")}
            </label>
            <div className="flex items-center gap-3 rounded-md border border-gray-700/60 bg-gray-800/40 px-3 py-2">
              <Switch id="forceWorldCopy" checked={forceWorldCopy} onCheckedChange={setForceWorldCopy} />
              <span className="text-sm text-gray-300">{t("forceWorldCopyDescription")}</span>
            </div>
          </div>
        </div>

        <Button type="button" onClick={handleApply} disabled={saving || loading || worlds.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/40">
          {saving ? t("saving") : t("applyWorldAndRestart")}
        </Button>
      </CardContent>
    </Card>
  );
};
