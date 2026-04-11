"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { DiscoverWorldItem, worldDiscoveryService } from "@/services/world-discovery/world-discovery.service";

interface WorldDiscoverPanelProps {
  onImported: () => void;
}

const PAGE_SIZE = 12;

export function WorldDiscoverPanel({ onImported }: WorldDiscoverPanelProps) {
  const { t } = useLanguage();
  const [source, setSource] = useState<"curseforge" | "url">("curseforge");
  const [query, setQuery] = useState("");
  const [targetFolder, setTargetFolder] = useState("");
  const [results, setResults] = useState<DiscoverWorldItem[]>([]);
  const [index, setIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [urlFileName, setUrlFileName] = useState("");

  const canPrev = index > 0;
  const canNext = useMemo(() => index + PAGE_SIZE < totalCount, [index, totalCount]);

  const runSearch = async (nextIndex = 0) => {
    setLoadingSearch(true);
    try {
      const response = await worldDiscoveryService.searchCurseforgeWorlds({
        q: query.trim() || undefined,
        pageSize: PAGE_SIZE,
        index: nextIndex,
      });
      setResults(response.data);
      setIndex(response.pagination.index);
      setTotalCount(response.pagination.totalCount);
      setExpandedProjectId(null);
    } catch (error) {
      console.error("Error searching worlds:", error);
      mcToast.error(t("worldDiscoverSearchError"));
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleImportCurseforge = async (world: DiscoverWorldItem) => {
    setImportingId(world.projectId);
    try {
      await worldDiscoveryService.importCurseforgeWorld({
        projectId: world.projectId,
        fileId: world.fileId,
        targetFolder: targetFolder.trim() || undefined,
      });
      mcToast.success(t("worldDiscoverImported"));
      onImported();
    } catch (error) {
      console.error("Error importing world:", error);
      mcToast.error(t("worldDiscoverImportError"));
    } finally {
      setImportingId(null);
    }
  };

  const handleImportUrl = async () => {
    if (!downloadUrl.trim()) {
      mcToast.error(t("worldDiscoverUrlRequired"));
      return;
    }

    setImportingId("url");
    try {
      await worldDiscoveryService.importWorldFromUrl({
        downloadUrl: downloadUrl.trim(),
        fileName: urlFileName.trim() || undefined,
        targetFolder: targetFolder.trim() || undefined,
      });
      mcToast.success(t("worldDiscoverImported"));
      setDownloadUrl("");
      setUrlFileName("");
      onImported();
    } catch (error) {
      console.error("Error importing world from URL:", error);
      mcToast.error(t("worldDiscoverImportError"));
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-emerald-400 font-minecraft">{t("worldDiscoverTitle")}</CardTitle>
        <CardDescription className="text-gray-300">{t("worldDiscoverDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">{t("worldDiscoverSource")}</label>
            <Select value={source} onValueChange={(value: "curseforge" | "url") => setSource(value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-gray-100">
                <SelectItem value="curseforge">CurseForge</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-200">{t("worldDiscoverTargetFolder")}</label>
            <Input
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              placeholder={t("worldDiscoverTargetFolderPlaceholder")}
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
        </div>

        {source === "curseforge" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch(0)}
                  placeholder={t("worldDiscoverSearchPlaceholder")}
                  className="bg-gray-800 border-gray-700 text-gray-100 pl-9"
                />
              </div>
              <Button onClick={() => runSearch(0)} disabled={loadingSearch} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : t("search")}
              </Button>
            </div>

            <div className="space-y-2 rounded-md border border-gray-700/60 bg-gray-900/30 p-2 max-h-80 overflow-y-auto">
              {loadingSearch ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                </div>
              ) : results.length === 0 ? (
                <p className="text-sm text-gray-400 px-2 py-1">{t("worldDiscoverEmpty")}</p>
              ) : (
                results.map((world) => (
                  <div
                    key={world.projectId}
                    onClick={() => setExpandedProjectId((current) => (current === world.projectId ? null : world.projectId))}
                    className="rounded-md border border-gray-700/60 bg-gray-800/40 p-3 cursor-pointer transition-colors hover:bg-gray-800/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {world.iconUrl ? (
                            <Image src={world.iconUrl} alt={world.name} width={20} height={20} className="rounded" />
                          ) : null}
                          <p className="text-sm font-medium text-gray-100 truncate">{world.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{world.summary || t("noDescription")}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleImportCurseforge(world);
                        }}
                        disabled={!world.importable || importingId === world.projectId}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                      >
                        {importingId === world.projectId ? <Loader2 className="h-4 w-4 animate-spin" /> : t("worldDiscoverImport")}
                      </Button>
                    </div>

                    {expandedProjectId === world.projectId ? (
                      <div className="mt-3 space-y-2 border-t border-gray-700/60 pt-3">
                        <p className="text-xs text-gray-300">{world.summary || t("noDescription")}</p>
                        {world.fileName ? <p className="text-xs text-gray-500">{world.fileName}</p> : null}
                        {typeof world.downloads === "number" ? (
                          <p className="text-xs text-gray-400">Downloads: {world.downloads.toLocaleString()}</p>
                        ) : null}
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`https://www.curseforge.com/minecraft/worlds/${world.slug}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
                            onClick={(event) => event.stopPropagation()}
                          >
                            CurseForge
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" disabled={!canPrev || loadingSearch} onClick={() => runSearch(Math.max(index - PAGE_SIZE, 0))}>
                {t("previous")}
              </Button>
              <Button type="button" variant="outline" disabled={!canNext || loadingSearch} onClick={() => runSearch(index + PAGE_SIZE)}>
                {t("next")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">{t("worldDiscoverUrlLabel")}</label>
              <Input
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://example.com/world.zip"
                className="bg-gray-800 border-gray-700 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">{t("worldDiscoverFileName")}</label>
              <Input
                value={urlFileName}
                onChange={(e) => setUrlFileName(e.target.value)}
                placeholder="optional-world-name.zip"
                className="bg-gray-800 border-gray-700 text-gray-100"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleImportUrl} disabled={importingId === "url"} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                {importingId === "url" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("worldDiscoverImport")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
