"use client";

import axios from "axios";
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import {
  BedrockAddon,
  BedrockAddonSearchItem,
  bedrockAddonsService,
} from "@/services/bedrock-addons/bedrock-addons.service";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleOff, Download, ExternalLink, FileArchive, Loader2, Package, Search, Trash2, Upload } from "lucide-react";

interface BedrockAddonsTabProps {
  serverId: string;
  refreshToken?: number;
}

const SEARCH_PAGE_SIZE = 8;
const BEDROCK_ADDONS_DOCS_URL = "https://minepanel.ketbome.com/mods-plugins#bedrock-addons";

const normalizeAddonText = (value: string) =>
  value
    .replace(/§./g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const BedrockAddonsTab: FC<BedrockAddonsTabProps> = ({ serverId, refreshToken = 0 }) => {
  const { t } = useLanguage();
  const [addons, setAddons] = useState<BedrockAddon[]>([]);
  const [levelName, setLevelName] = useState("Bedrock level");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BedrockAddonSearchItem[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [blockingMessage, setBlockingMessage] = useState<string | null>(null);

  const isBusy = blockingMessage !== null;

  const canGoPrevious = searchIndex > 0;
  const canGoNext = searchIndex + SEARCH_PAGE_SIZE < searchTotalCount;

  const sortedAddons = useMemo(
    () => [...addons].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [addons],
  );

  const selectedFileName = selectedFile ? normalizeAddonText(selectedFile.name) : null;

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;
      if (Array.isArray(message)) {
        return message.join("\n");
      }
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }, []);

  const loadAddons = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const response = await bedrockAddonsService.list(serverId);
      setAddons(response.addons);
      setLevelName(response.levelName);
    } catch (error) {
      console.error("Error loading Bedrock addons:", error);
      mcToast.error(getErrorMessage(error, t("bedrockAddonsLoadError")));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [getErrorMessage, serverId, t]);

  useEffect(() => {
    loadAddons();
  }, [loadAddons, refreshToken]);

  const runSearch = async (nextIndex = 0) => {
    setSearching(true);
    try {
      const response = await bedrockAddonsService.searchCurseForge(serverId, {
        q: searchQuery.trim() || undefined,
        pageSize: SEARCH_PAGE_SIZE,
        index: nextIndex,
      });
      setSearchResults(response.data);
      setSearchIndex(response.pagination.index);
      setSearchTotalCount(response.pagination.totalCount);
    } catch (error) {
      console.error("Error searching Bedrock addons:", error);
      mcToast.error(getErrorMessage(error, t("bedrockAddonsActionError")));
    } finally {
      setSearching(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      mcToast.error(t("bedrockAddonsNoFileSelected"));
      return;
    }

    setUploading(true);
    setBlockingMessage(t("bedrockAddonsProcessingUpload"));
    try {
      await bedrockAddonsService.upload(serverId, selectedFile);
      setSelectedFile(null);
      const fileInput = document.getElementById("bedrock-addon-upload") as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
      await loadAddons({ silent: true });
      mcToast.success(t("bedrockAddonsUploadSuccess"));
    } catch (error) {
      console.error("Error uploading Bedrock addon:", error);
      mcToast.error(getErrorMessage(error, t("bedrockAddonsActionError")));
    } finally {
      setUploading(false);
      setBlockingMessage(null);
    }
  };

  const handleImport = async (result: BedrockAddonSearchItem) => {
    setActionId(`import-${result.projectId}`);
    setBlockingMessage(t("bedrockAddonsProcessingImport"));
    try {
      await bedrockAddonsService.importCurseForge(serverId, {
        projectId: result.projectId,
        fileId: result.fileId,
      });
      await loadAddons({ silent: true });
      mcToast.success(t("bedrockAddonsImportSuccess"));
    } catch (error) {
      console.error("Error importing Bedrock addon:", error);
      mcToast.error(getErrorMessage(error, t("bedrockAddonsActionError")));
    } finally {
      setActionId(null);
      setBlockingMessage(null);
    }
  };

  const handleToggle = async (addon: BedrockAddon) => {
    setActionId(addon.id);
    setBlockingMessage(t(addon.enabled ? "bedrockAddonsProcessingDisable" : "bedrockAddonsProcessingEnable"));
    try {
      if (addon.enabled) {
        await bedrockAddonsService.disable(serverId, addon.id);
        mcToast.success(t("bedrockAddonsDisableSuccess"));
      } else {
        await bedrockAddonsService.enable(serverId, addon.id);
        mcToast.success(t("bedrockAddonsEnableSuccess"));
      }
      await loadAddons({ silent: true });
    } catch (error) {
      console.error("Error toggling Bedrock addon:", error);
      mcToast.error(getErrorMessage(error, t("bedrockAddonsActionError")));
    } finally {
      setActionId(null);
      setBlockingMessage(null);
    }
  };

  const handleDelete = async (addon: BedrockAddon) => {
    const confirmed = window.confirm(`${t("deleteConfirmMessage")} ${addon.name}?`);
    if (!confirmed) {
      return;
    }

    setActionId(`delete-${addon.id}`);
    setBlockingMessage(t("bedrockAddonsProcessingDelete"));
    try {
      await bedrockAddonsService.remove(serverId, addon.id);
      await loadAddons({ silent: true });
      mcToast.success(t("bedrockAddonsDeleteSuccess"));
    } catch (error) {
      console.error("Error deleting Bedrock addon:", error);
      mcToast.error(getErrorMessage(error, t("bedrockAddonsActionError")));
    } finally {
      setActionId(null);
      setBlockingMessage(null);
    }
  };

  return (
    <Card className="relative overflow-hidden bg-gray-900/60 border-gray-700/50 shadow-lg" aria-busy={isBusy}>
      {isBusy ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/72 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-emerald-500/25 bg-gray-900/95 p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="font-minecraft text-lg text-emerald-300">{t("bedrockAddonsProcessingTitle")}</p>
            <p className="mt-2 text-sm text-gray-200">{blockingMessage}</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">{t("bedrockAddonsProcessingHint")}</p>
          </div>
        </div>
      ) : null}
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-green-400 font-minecraft flex items-center gap-2">
          <Package className="h-6 w-6" />
          {t("addons")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("bedrockAddonsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-emerald-900/40 bg-linear-to-r from-gray-900/90 via-gray-800/75 to-gray-900/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-minecraft uppercase tracking-[0.18em] text-emerald-300">
                Bedrock
              </Badge>
              <p className="text-sm text-gray-300">
                {t("bedrockAddonsLevelName")} <span className="font-minecraft text-emerald-300">{levelName}</span>
              </p>
            </div>
            <Button asChild variant="minepanelOutline" className="font-minecraft text-xs text-emerald-300 hover:text-emerald-200">
              <a href={BEDROCK_ADDONS_DOCS_URL} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-4 w-4" />
                {t("bedrockAddonsDocsLink")}
              </a>
            </Button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">{t("bedrockAddonsLibraryPath")}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-gray-700/60 bg-gray-800/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <h3 className="text-sm font-minecraft text-green-400">{t("bedrockAddonsSourceTitle")}</h3>
            <div className="space-y-3">
              <input
                id="bedrock-addon-upload"
                type="file"
                accept=".mcaddon,.mcpack,.zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-2 text-cyan-300">
                    <FileArchive className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-minecraft uppercase tracking-[0.18em] text-gray-400">{t("bedrockAddonsFileLabel")}</p>
                    <p className="mt-1 truncate text-sm text-gray-100">
                      {selectedFileName || t("bedrockAddonsSupportedFiles")}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{t("bedrockAddonsFileHint")}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="minepanelOutline" className="flex-1 font-minecraft">
                    <label htmlFor="bedrock-addon-upload" className={`cursor-pointer ${isBusy ? "pointer-events-none opacity-60" : ""}`}>
                      <FileArchive className="h-4 w-4" />
                      {t("bedrockAddonsSelectFile")}
                    </label>
                  </Button>
                  <Button type="button" variant="minepanel" onClick={handleUpload} disabled={!selectedFile || uploading || isBusy} className="flex-1 font-minecraft">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {t("upload")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-700/60 pt-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && runSearch(0)}
                    placeholder={t("bedrockAddonsSearchPlaceholder")}
                    disabled={isBusy}
                    className="h-11 rounded-xl border-gray-700/80 bg-gray-900/70 pl-9 text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                  />
                </div>
                <Button type="button" variant="minepanelOutline" onClick={() => runSearch(0)} disabled={searching || isBusy} className="h-11 px-4 font-minecraft text-cyan-300 hover:border-cyan-500/60 hover:bg-cyan-950/30 hover:text-cyan-200">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="hidden sm:inline">{t("search")}</span>
                </Button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto rounded-xl border border-gray-700/60 bg-gray-900/30 p-2">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-gray-400 px-2 py-3">{searching ? t("loading") : t("bedrockAddonsNoAddonResults")}</p>
                ) : (
                  searchResults.map((result) => (
                    <div key={result.projectId} className="rounded-xl border border-gray-700/70 bg-linear-to-br from-gray-800/55 to-gray-900/40 p-3 transition-colors hover:border-cyan-500/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {result.iconUrl ? <Image src={result.iconUrl} alt={result.name} width={20} height={20} className="rounded" /> : null}
                            <p className="truncate text-sm font-medium text-gray-100">{normalizeAddonText(result.name)}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{result.summary || t("noDescription")}</p>
                          {result.fileName ? <p className="text-xs text-gray-500 mt-2">{result.fileName}</p> : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="minepanelOutline"
                          onClick={() => handleImport(result)}
                          disabled={!result.importable || actionId === `import-${result.projectId}` || isBusy}
                          className="h-9 rounded-lg border-cyan-500/40 bg-cyan-950/25 px-3 font-minecraft text-cyan-300 hover:border-cyan-400/60 hover:bg-cyan-900/30 hover:text-cyan-100"
                        >
                          {actionId === `import-${result.projectId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          {t("bedrockAddonsImportButton")}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="minepanelOutline" disabled={!canGoPrevious || searching || isBusy} onClick={() => runSearch(Math.max(searchIndex - SEARCH_PAGE_SIZE, 0))} className="font-minecraft text-gray-200">
                  <ChevronLeft className="h-4 w-4" />
                  {t("previous")}
                </Button>
                <Button type="button" variant="minepanelOutline" disabled={!canGoNext || searching || isBusy} onClick={() => runSearch(searchIndex + SEARCH_PAGE_SIZE)} className="font-minecraft text-gray-200">
                  {t("next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-700/60 bg-gray-800/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <h3 className="text-sm font-minecraft text-green-400">{t("bedrockAddonsInstalledTitle")}</h3>
            {loading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : sortedAddons.length === 0 ? (
              <p className="text-sm text-gray-400">{t("bedrockAddonsEmpty")}</p>
            ) : (
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                {sortedAddons.map((addon) => (
                  <div key={addon.id} className="rounded-xl border border-gray-700/70 bg-linear-to-br from-gray-900/65 to-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:border-emerald-500/25">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-100">{normalizeAddonText(addon.name)}</p>
                          <Badge variant="outline" className={addon.enabled ? "rounded-full border-emerald-500/40 bg-emerald-950/35 px-2.5 py-1 text-xs font-minecraft uppercase tracking-[0.12em] text-emerald-300" : "rounded-full border-gray-600 bg-gray-900/70 px-2.5 py-1 text-xs font-minecraft uppercase tracking-[0.12em] text-gray-300"}>
                            {addon.enabled ? t("bedrockAddonsEnabledBadge") : t("bedrockAddonsDisabledBadge")}
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-cyan-500/40 bg-cyan-950/25 px-2.5 py-1 text-xs font-minecraft uppercase tracking-[0.12em] text-cyan-300">
                            {addon.source === "curseforge" ? "CurseForge" : t("upload")}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{addon.fileName}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-gray-400">{t("bedrockAddonsDetectedPacks")}</p>
                      <div className="flex flex-wrap gap-2">
                        {addon.packs.map((pack) => (
                          <Badge key={`${addon.id}-${pack.kind}-${pack.uuid}`} variant="outline" className="rounded-full border-gray-600/80 bg-gray-900/80 px-3 py-1 text-gray-200">
                            {pack.kind === "behavior" ? "BP" : "RP"} · {normalizeAddonText(pack.name)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-end gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant={addon.enabled ? "minepanelOutline" : "minepanel"}
                        onClick={() => handleToggle(addon)}
                        disabled={actionId === addon.id || isBusy}
                        className={addon.enabled ? "font-minecraft text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-950/30 hover:text-emerald-200" : "font-minecraft"}
                      >
                        {actionId === addon.id ? <Loader2 className="h-4 w-4 animate-spin" /> : addon.enabled ? <CircleOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {addon.enabled ? t("bedrockAddonsDisableButton") : t("bedrockAddonsEnableButton")}
                      </Button>
                      <Button
                        type="button"
                        variant="minepanelDanger"
                        onClick={() => handleDelete(addon)}
                        disabled={actionId === `delete-${addon.id}` || isBusy}
                        className="font-minecraft"
                      >
                        {actionId === `delete-${addon.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
