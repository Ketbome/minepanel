"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Package, AlertCircle, TrendingUp, Star } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import ModpackCard from "@/components/molecules/modpacks/ModpackCard";
import { ModpackSearch } from "@/components/organisms/ModpackSearch";
import { ModpackDetailsModalEnhanced } from "@/components/molecules/modpacks/ModpackDetailsModalEnhanced";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CurseForgeModpack, searchModpacks, getFeaturedModpacks, getPopularModpacks } from "@/services/curseforge/curseforge.service";
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
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (errorMessage.includes("API key") || errorMessage.includes("403")) {
        setError(t("curseforgeApiKeyNotConfigured"));
      } else {
        setError(t("errorLoadingModpacks"));
      }
      mcToast.error(t("errorLoadingModpacks"));
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
        <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
        <p className="text-gray-400 font-minecraft">{t("loadingModpacks")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Image src="/images/bookshelf.webp" alt="Templates" width={40} height={40} />
          <h1 className="text-3xl font-bold text-white font-minecraft">{t("modpackTemplates")}</h1>
        </div>
        <p className="text-gray-400">{t("modpackTemplatesDescription")}</p>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Alert className="border-2 border-red-600/40 bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertTitle className="text-red-400">{t("error")}</AlertTitle>
            <AlertDescription className="text-gray-300">
              {error}
              {error === t("curseforgeApiKeyNotConfigured") && (
                <a href="/dashboard/settings" className="block mt-2 text-emerald-400 hover:underline">
                  {t("goToSettings")}
                </a>
              )}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {!error && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <ModpackSearch onSearch={handleSearch} isLoading={isSearching} />
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-800 border border-gray-700">
              <TabsTrigger value="featured" className="text-white data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <Star className="w-4 h-4 mr-2" />
                {t("featured")}
              </TabsTrigger>
              <TabsTrigger value="popular" className="text-white data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <TrendingUp className="w-4 h-4 mr-2" />
                {t("popular")}
              </TabsTrigger>
              <TabsTrigger value="search" className="text-white data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
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
        <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
          <Image src="/images/diamond.webp" alt="Diamond" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </motion.div>
        <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3, delay: 0.5, ease: "easeInOut" }}>
          <Image src="/images/bookshelf.webp" alt="Bookshelf" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </motion.div>
        <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3, delay: 1, ease: "easeInOut" }}>
          <Image src="/images/emerald.webp" alt="Emerald" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
        </motion.div>
      </div>
    </div>
  );
}
