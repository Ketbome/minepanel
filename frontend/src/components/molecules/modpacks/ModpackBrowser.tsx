"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurseForgeModpack, searchModpacks, getPopularModpacks } from "@/services/curseforge/curseforge.service";
import { Search, Loader2, Package, Download, Check } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";

interface ModpackBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (modpack: CurseForgeModpack) => void;
}

export function ModpackBrowser({ open, onClose, onSelect }: ModpackBrowserProps) {
  const { t } = useLanguage();
  const [modpacks, setModpacks] = useState<CurseForgeModpack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadPopular = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getPopularModpacks(12);
      setModpacks(response.data);
      setHasSearched(true);
    } catch (err) {
      console.error("Error loading modpacks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadPopular();
      return;
    }
    setIsLoading(true);
    try {
      const response = await searchModpacks(searchQuery, 12);
      setModpacks(response.data);
      setHasSearched(true);
    } catch (err) {
      console.error("Error searching modpacks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (modpack: CurseForgeModpack) => {
    setSelectedId(modpack.id);
    onSelect(modpack);
    setTimeout(() => {
      onClose();
      setSelectedId(null);
    }, 300);
  };

  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-gray-900 border border-gray-700 text-white p-0">
        <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-6 py-4">
          <DialogTitle className="text-xl font-bold font-minecraft text-emerald-400 flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            {t("browseModpacks")}
          </DialogTitle>
          <div className="flex gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder={t("searchModpacks")} className="bg-gray-800 border-gray-700 text-white" />
            <Button onClick={handleSearch} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button onClick={loadPopular} disabled={isLoading} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              {t("popular")}
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-gray-400 mt-2">{t("loading")}</p>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-minecraft">{t("searchOrBrowsePopular")}</p>
            </div>
          ) : modpacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Image src="/images/barrier.webp" alt="No results" width={48} height={48} className="opacity-50 mb-4" />
              <p>{t("noModpacksFound")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modpacks.map((modpack) => (
                <div key={modpack.id} onClick={() => handleSelect(modpack)} className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedId === modpack.id ? "border-emerald-500 bg-emerald-900/30" : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"}`}>
                  {modpack.logo && <Image src={modpack.logo.url} alt={modpack.name} width={48} height={48} className="rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-minecraft text-sm text-white truncate">{modpack.name}</h3>
                      {selectedId === modpack.id && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">{modpack.summary}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                        <Download className="h-3 w-3 mr-1" />
                        {formatDownloads(modpack.downloadCount)}
                      </Badge>
                      {modpack.latestFiles?.[0]?.gameVersions?.[0] && (
                        <Badge variant="secondary" className="text-xs bg-blue-900/50 text-blue-300">
                          {modpack.latestFiles[0].gameVersions[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
