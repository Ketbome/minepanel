"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurseForgeModpack, searchModpacks, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { Search, Loader2, Package, Download, Check, Calendar, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";

interface ModpackBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (modpack: CurseForgeModpack) => void;
}

const PAGE_SIZE = 12;

// CurseForge sort fields: 2 = Popularity, 3 = LastUpdated, 6 = TotalDownloads.
const SORT_FIELDS = {
  relevance: 2,
  downloads: 6,
  updated: 3,
} as const;

type SortField = keyof typeof SORT_FIELDS;

const SORT_LABELS: Record<SortField, "sortRelevance" | "sortDownloads" | "sortUpdated"> = {
  relevance: "sortRelevance",
  downloads: "sortDownloads",
  updated: "sortUpdated",
};

export function ModpackBrowser({ open, onClose, onSelect }: ModpackBrowserProps) {
  const { t } = useLanguage();
  const [modpacks, setModpacks] = useState<CurseForgeModpack[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortField>("relevance");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (nextPageIndex: number, reset: boolean = false) => {
      if (!open) return;

      if (reset) {
        setIsLoadingInitial(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await searchModpacks(searchQuery.trim() || undefined, PAGE_SIZE, nextPageIndex * PAGE_SIZE, SORT_FIELDS[sort], "desc");

        setModpacks((prev) => {
          if (reset) return response.data;

          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...response.data.filter((item) => !seen.has(item.id))];
        });

        const fetchedSoFar = (nextPageIndex + 1) * PAGE_SIZE;
        setHasMore(response.data.length > 0 && fetchedSoFar < response.pagination.totalCount);
        setPageIndex(nextPageIndex);
      } catch (err) {
        console.error("Error searching modpacks:", err);
      } finally {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
      }
    },
    [open, searchQuery, sort]
  );

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSort("relevance");
      setModpacks([]);
      return;
    }

    const timeout = setTimeout(() => {
      setPageIndex(0);
      setHasMore(true);
      void fetchPage(0, true);
    }, 350);

    return () => clearTimeout(timeout);
  }, [open, searchQuery, sort, fetchPage]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !open || !hasMore || isLoadingInitial || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchPage(pageIndex + 1, false);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [open, hasMore, isLoadingInitial, isLoadingMore, pageIndex, fetchPage]);

  const handleSelect = (modpack: CurseForgeModpack) => {
    setSelectedId(modpack.id);
    onSelect(modpack);
    setTimeout(() => {
      onClose();
      setSelectedId(null);
    }, 300);
  };

  const handleExternalLink = (event: React.MouseEvent, modpack: CurseForgeModpack) => {
    event.stopPropagation();
    window.open(modpack.links.websiteUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[min(96vw,80rem)] sm:max-w-none max-h-[88vh] overflow-hidden bg-gray-900 border border-gray-700 text-white p-0 flex flex-col">
        <div className="shrink-0 border-b border-gray-700 bg-gray-900 px-6 py-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <DialogTitle className="text-xl font-minecraft text-emerald-400 flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("browseModpacks")}
            </DialogTitle>
            <p className="text-xs text-gray-400">{t("browseModpacksDesc")}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_240px]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchModpacks")}
                className="h-11 pl-10 bg-gray-800 border-gray-600/80 text-white font-minecraft tracking-wide focus:border-emerald-500/60"
              />
            </div>
            <Select value={sort} onValueChange={(value: SortField) => setSort(value)}>
              <SelectTrigger className="h-11 w-full bg-gray-800 border-gray-600/80 text-gray-200 font-minecraft text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                {(Object.keys(SORT_FIELDS) as SortField[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {t("sortBy")}: {t(SORT_LABELS[option])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingInitial ? (
            <div className="flex flex-col items-center justify-center py-14">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-gray-400 mt-2">{t("loading")}</p>
            </div>
          ) : modpacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Image src="/images/barrier.webp" alt="No results" width={50} height={50} className="opacity-60 mb-4" />
              <p className="font-minecraft text-sm">{t("noModpacksFound")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {modpacks.map((modpack) => (
                <button
                  key={modpack.id}
                  type="button"
                  onClick={() => handleSelect(modpack)}
                  className={`flex flex-col text-left border-2 bg-gray-800/60 p-4 transition-colors ${selectedId === modpack.id ? "border-emerald-500 bg-emerald-900/20" : "border-[var(--mc-frame)] hover:bg-gray-800"}`}
                >
                  <div className="flex gap-3 items-start">
                    {modpack.logo?.url ? (
                      <Image src={modpack.logo.url} alt={modpack.name} width={48} height={48} className="h-12 w-12 object-cover shrink-0 border-2 border-[var(--mc-frame)]" />
                    ) : (
                      <div className="h-12 w-12 bg-gray-700/60 shrink-0 border-2 border-[var(--mc-frame)]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-minecraft text-sm text-white leading-snug line-clamp-2 flex items-start gap-2">
                        {modpack.name}
                        {selectedId === modpack.id && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                      </h4>
                      <p className="mt-1 text-[11px] text-gray-500 truncate">{modpack.authors?.[0]?.name}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-300/90 line-clamp-2 leading-relaxed min-h-10">{modpack.summary || "-"}</p>

                  <div className="mt-3 flex items-center gap-1.5 flex-wrap min-h-6 content-start">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-700 text-gray-300">
                      <Download className="h-3 w-3 mr-1" />
                      {formatDownloadCount(modpack.downloadCount)}
                    </Badge>
                    {modpack.latestFiles?.[0]?.gameVersions?.[0] && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-900/50 text-blue-300">
                        <Calendar className="h-3 w-3 mr-1" />
                        {modpack.latestFiles[0].gameVersions[0]}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-auto pt-4 flex gap-2">
                    <span className="flex-1 inline-flex items-center justify-center bg-emerald-600 px-3 py-2 text-xs font-minecraft text-white">{t("selectModpack")}</span>
                    <Button type="button" variant="outline" size="sm" onClick={(event) => handleExternalLink(event, modpack)} className="h-auto border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </button>
              ))}
              <div ref={loadMoreRef} className="h-10 col-span-full flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("loading")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
