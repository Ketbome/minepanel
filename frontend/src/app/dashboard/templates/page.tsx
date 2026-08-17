"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Loader2, Package, AlertCircle, Info, TrendingUp, Star } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import ModpackCard from "@/components/molecules/modpacks/ModpackCard";
import { ModpackSearch } from "@/components/organisms/ModpackSearch";
import { ModpackDetailsModalEnhanced } from "@/components/molecules/modpacks/ModpackDetailsModalEnhanced";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurseForgeModpack, searchModpacks, getFeaturedModpacks, getPopularModpacks, isCurseForgeApiKeyError } from "@/services/curseforge/curseforge.service";
import { mcToast } from "@/lib/utils/minecraft-toast";

export default function TemplatesPage() {
  const { t } = useLanguage();
  const [modpacks, setModpacks] = useState<CurseForgeModpack[]>([]);
  const [featuredModpacks, setFeaturedModpacks] = useState<CurseForgeModpack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedModpack, setSelectedModpack] = useState<CurseForgeModpack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState("popular");
  const [pagination, setPagination] = useState({
    index: 0,
    pageSize: 20,
    totalCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSort, setSearchSort] = useState({ field: 2, order: "desc" as "asc" | "desc" });

  const observerTarget = useRef<HTMLDivElement>(null);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNeedsApiKey(false);

    try {
      const [popularResponse, featuredResponse] = await Promise.all([getPopularModpacks(18), getFeaturedModpacks(12)]);

      setModpacks(popularResponse.data);
      setFeaturedModpacks(featuredResponse.data);
      setPagination({
        index: popularResponse.pagination.index,
        pageSize: popularResponse.pagination.pageSize,
        totalCount: popularResponse.pagination.totalCount,
      });
    } catch (err) {
      console.error("Error loading modpacks:", err);

      if (isCurseForgeApiKeyError(err)) {
        setNeedsApiKey(true);
      } else {
        setError(t("errorLoadingModpacks"));
        mcToast.error(t("errorLoadingModpacks"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSearch = async (query: string, sortField: number, sortOrder: "asc" | "desc") => {
    setIsSearching(true);
    setError(null);
    setSearchQuery(query);
    setSearchSort({ field: sortField, order: sortOrder });

    try {
      const response = await searchModpacks(query, 18, 0, sortField, sortOrder);
      setModpacks(response.data);
      setPagination({
        index: response.pagination.index,
        pageSize: response.pagination.pageSize,
        totalCount: response.pagination.totalCount,
      });
      setActiveTab("search");
    } catch (err) {
      console.error("Error searching modpacks:", err);
      mcToast.error(t("errorSearchingModpacks"));
    } finally {
      setIsSearching(false);
    }
  };

  const loadMoreModpacks = useCallback(async () => {
    if (isLoadingMore || modpacks.length >= pagination.totalCount) return;

    setIsLoadingMore(true);
    try {
      const nextIndex = pagination.index + pagination.pageSize;
      let response;

      if (activeTab === "search" && searchQuery) {
        response = await searchModpacks(searchQuery, 18, nextIndex, searchSort.field, searchSort.order);
      } else {
        response = await searchModpacks("", 18, nextIndex, 2, "desc");
      }

      setModpacks((prev) => [...prev, ...response.data]);
      setPagination({
        index: response.pagination.index,
        pageSize: response.pagination.pageSize,
        totalCount: response.pagination.totalCount,
      });
    } catch (err) {
      console.error("Error loading more modpacks:", err);
      mcToast.error(t("errorLoadingModpacks"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, modpacks.length, pagination, activeTab, searchQuery, searchSort, t]);

  const handleSelectModpack = (modpack: CurseForgeModpack) => {
    setSelectedModpack(modpack);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isSearching) {
          loadMoreModpacks();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreModpacks, isLoadingMore, isSearching]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Image src="/images/loading-cube.webp" alt="" width={64} height={64} className="pixelated animate-spin-slow" />
        <p className="text-gray-300 font-minecraft">{t("loadingModpacks")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recipe book header */}
      <div className="mc-panel animate-fade-in-up">
        <div className="mc-titlebar flex items-center gap-3 px-4 py-3">
          <Image src="/images/bookshelf.webp" alt="Templates" width={32} height={32} className="pixelated animate-float" />
          <div>
            <h1 className="text-xl sm:text-2xl font-minecraft text-white drop-shadow-glow leading-tight">{t("modpackTemplates")}</h1>
            <p className="text-gray-300 text-xs">{t("modpackTemplatesDescription")}</p>
          </div>
        </div>
      </div>

      {needsApiKey && (
        <div className="animate-fade-in">
          <div className="mc-slot p-4 space-y-3" style={{ borderColor: "#f0b95a" }}>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-minecraft text-amber-300 mb-1">{t("curseforgeApiKey")}</p>
                <p className="text-gray-300">{t("curseforgeApiKeyNotConfigured")}</p>
              </div>
            </div>
            <div className="space-y-2 sm:pl-8">
              <p className="font-minecraft text-xs text-gray-200">{t("cfApiKeyHowTo")}</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                <li>{t("cfApiKeyStep1")}</li>
                <li>{t("cfApiKeyStep2")}</li>
                <li>{t("cfApiKeyStep3")}</li>
              </ol>
              <div className="flex flex-wrap gap-4 pt-1 font-minecraft text-xs">
                <a href="https://console.curseforge.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                  {t("getCurseforgeApiKey")}
                </a>
                <a href="/dashboard/settings/integrations" className="text-emerald-400 hover:underline">
                  {t("goToSettings")}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="animate-fade-in">
          <div className="mc-slot flex items-start gap-3 p-4" style={{ borderColor: "#f05a5a" }}>
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-minecraft text-red-300 mb-1">{t("error")}</p>
              <p className="text-gray-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!error && !needsApiKey && (
        <>
          <div className="animate-fade-in-up stagger-1">
            <ModpackSearch onSearch={handleSearch} isLoading={isSearching} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-auto">
              <TabsTrigger value="featured">
                <Star className="w-4 h-4 mr-2" />
                {t("featured")}
              </TabsTrigger>
              <TabsTrigger value="popular">
                <TrendingUp className="w-4 h-4 mr-2" />
                {t("popular")}
              </TabsTrigger>
              <TabsTrigger value="search">
                <Package className="w-4 h-4 mr-2" />
                {t("searchResults")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="featured" className="mt-6">
              {featuredModpacks.length === 0 ? (
                <div className="text-center py-12">
                  <Image src="/images/barrier.webp" alt="No results" width={64} height={64} className="mx-auto opacity-50 mb-4" />
                  <p className="text-gray-400">{t("noModpacksFound")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {featuredModpacks.map((modpack) => (
                    <ModpackCard key={modpack.id} modpack={modpack} onSelect={handleSelectModpack} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="popular" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {modpacks.map((modpack) => (
                    <ModpackCard key={modpack.id} modpack={modpack} onSelect={handleSelectModpack} />
                  ))}
                </div>

                {modpacks.length < pagination.totalCount && (
                  <div ref={observerTarget} className="flex justify-center py-8">
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="font-minecraft">{t("loading")}</span>
                      </div>
                    )}
                  </div>
                )}

                {modpacks.length >= pagination.totalCount && modpacks.length > 0 && (
                  <div className="text-center py-4 text-gray-500 font-minecraft">
                    {t("showing")} {modpacks.length} {t("of")} {pagination.totalCount} modpacks
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              {modpacks.length === 0 ? (
                <div className="text-center py-12">
                  <Image src="/images/barrier.webp" alt="No results" width={64} height={64} className="mx-auto opacity-50 mb-4" />
                  <p className="text-gray-400">{t("noModpacksFound")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {modpacks.map((modpack) => (
                      <ModpackCard key={modpack.id} modpack={modpack} onSelect={handleSelectModpack} />
                    ))}
                  </div>

                  {modpacks.length < pagination.totalCount && (
                    <div ref={observerTarget} className="flex justify-center py-8">
                      {isLoadingMore && (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="font-minecraft">{t("loading")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {modpacks.length >= pagination.totalCount && modpacks.length > 0 && (
                    <div className="text-center py-4 text-gray-500 font-minecraft">
                      {t("showing")} {modpacks.length} {t("of")} {pagination.totalCount} modpacks
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <ModpackDetailsModalEnhanced modpack={selectedModpack} open={!!selectedModpack} onClose={() => setSelectedModpack(null)} />

      <div className="flex justify-center gap-8 pt-8">
        <div className="animate-float">
          <Image src="/images/diamond.webp" alt="Diamond" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </div>
        <div className="animate-float-delay-1">
          <Image src="/images/bookshelf.webp" alt="Bookshelf" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </div>
        <div className="animate-float-delay-2">
          <Image src="/images/emerald.webp" alt="Emerald" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
