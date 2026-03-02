"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Loader2, Plus, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { ModLoader, ModProvider, ModSearchItem, searchModsByProvider } from "@/services/mods/mods-browser.service";

interface ModsBrowserDialogProps {
  open: boolean;
  onClose: () => void;
  provider: ModProvider;
  minecraftVersion: string;
  loader?: ModLoader;
  onAdd: (mod: ModSearchItem, insertAs: "slug" | "id") => boolean;
}

const formatDownloads = (count?: number): string => {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return `${count}`;
};

export function ModsBrowserDialog({
  open,
  onClose,
  provider,
  minecraftVersion,
  loader,
  onAdd,
}: ModsBrowserDialogProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [insertAs, setInsertAs] = useState<"slug" | "id">("slug");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ModSearchItem[]>([]);

  const providerLabel = useMemo(() => {
    return provider === "curseforge" ? "CurseForge" : "Modrinth";
  }, [provider]);

  useEffect(() => {
    if (!open || !minecraftVersion) return;

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await searchModsByProvider(provider, {
          q: query.trim() || undefined,
          minecraftVersion,
          loader,
          pageSize: 20,
          index: 0,
          limit: 20,
          offset: 0,
        });
        setResults(response.data);
      } catch (error) {
        console.error("Error searching mods:", error);
        mcToast.error(t("errorSearchingMods"));
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [open, query, provider, minecraftVersion, loader, t]);

  const handleAddMod = (mod: ModSearchItem) => {
    const added = onAdd(mod, insertAs);
    if (added) {
      mcToast.success(`${t("addMod")}: ${insertAs === "id" ? mod.projectId : mod.slug}`);
      return;
    }

    mcToast.error(t("alreadyAdded"));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[82vh] overflow-hidden bg-gray-900 border border-gray-700 text-white p-0">
        <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-6 py-4 space-y-3">
          <DialogTitle className="text-xl font-minecraft text-emerald-400 flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t("searchMods")} - {providerLabel}
          </DialogTitle>
          <p className="text-xs text-gray-400">
            {t("searchModsDesc")} {minecraftVersion}
            {loader ? ` / ${loader}` : ""}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchMods")}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Select value={insertAs} onValueChange={(value: "slug" | "id") => setInsertAs(value)}>
              <SelectTrigger className="w-[170px] bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                <SelectItem value="slug">{t("insertAsSlug")}</SelectItem>
                <SelectItem value="id">{t("insertAsId")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <Filter className="h-3.5 w-3.5" />
            {t("compatibilityFiltered")}
          </div>
          {!loader && (
            <p className="text-xs text-amber-300/90">{t("loaderNotDetected")}</p>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(82vh-165px)] p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-14">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-gray-400 mt-2">{t("loading")}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Image src="/images/barrier.webp" alt="No results" width={50} height={50} className="opacity-60 mb-4" />
              <p className="font-minecraft text-sm">{t("noCompatibleModsFound")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.map((mod) => (
                <div key={`${provider}-${mod.projectId}`} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 flex gap-3">
                  {mod.iconUrl ? (
                    <Image src={mod.iconUrl} alt={mod.name} width={44} height={44} className="rounded-md h-11 w-11 object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-md bg-gray-700/60 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-minecraft text-sm text-white truncate">{mod.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">{mod.summary}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-200">
                        {insertAs === "id" ? mod.projectId : mod.slug}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-blue-900/40 text-blue-300">
                        {formatDownloads(mod.downloads)}
                      </Badge>
                      {(mod.supportedLoaders || []).slice(0, 2).map((modLoader) => (
                        <Badge key={`${mod.projectId}-${modLoader}`} variant="secondary" className="text-xs bg-emerald-900/40 text-emerald-300">
                          {modLoader}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddMod(mod)}
                    className="self-start bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("addMod")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
