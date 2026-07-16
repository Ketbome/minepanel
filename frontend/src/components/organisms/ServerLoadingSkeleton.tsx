"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/hooks/useLanguage";

export function ServerLoadingSkeleton() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="mc-panel p-6 space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-md bg-gray-700/50" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 bg-gray-700/50 mb-2" />
            <Skeleton className="h-4 w-32 bg-gray-700/50" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full bg-gray-700/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-20 w-full rounded-lg bg-gray-700/50" />
          <Skeleton className="h-20 w-full rounded-lg bg-gray-700/50" />
          <Skeleton className="h-20 w-full rounded-lg bg-gray-700/50" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mc-panel overflow-hidden animate-fade-in-up stagger-1">
        <div className="mc-titlebar flex gap-1 px-6 pt-6 pb-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-t-md bg-gray-700/50" />
          ))}
        </div>

        <div className="flex flex-col items-center justify-center py-20 px-6 space-y-6">
          <div className="relative h-20 w-20">
            <div className="animate-spin-slow">
              <Image src="/images/loading-cube.webp" alt="Loading" width={80} height={80} className="object-contain drop-shadow-lg" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h3 className="text-xl font-medium text-white font-minecraft">{t("loadingServerConfig")}</h3>
            <p className="text-gray-400">{t("preparingBlocks")}</p>
          </div>

          <div className="mc-bar w-80">
            <div className="mc-bar__fill animate-loading-bar" style={{ backgroundColor: "#9dff3f" }} />
          </div>

          <div className="flex gap-4 opacity-60">
            <div className="animate-float">
              <Image src="/images/redstone.webp" alt="Redstone" width={24} height={24} />
            </div>
            <div className="animate-float-delay-1">
              <Image src="/images/gold.webp" alt="Gold" width={24} height={24} />
            </div>
            <div className="animate-float-delay-2">
              <Image src="/images/emerald.webp" alt="Emerald" width={24} height={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
