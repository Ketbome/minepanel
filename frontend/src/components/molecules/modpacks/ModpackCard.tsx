"use client";

import Image from "next/image";
import { Download, Calendar, ExternalLink, Star, Sparkles } from "lucide-react";
import { CurseForgeModpack, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { FC, memo } from "react";

interface ModpackCardProps {
  readonly modpack: CurseForgeModpack;
  readonly onSelect?: (modpack: CurseForgeModpack) => void;
}

const ModpackCard: FC<ModpackCardProps> = ({ modpack, onSelect }) => {
  const { t } = useLanguage();

  const getLatestVersion = () => {
    return modpack.latestFiles?.[0]?.gameVersions?.[0] || "N/A";
  };

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(modpack.links.websiteUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="h-full animate-fade-in-up transition-transform duration-200 hover:-translate-y-1">
      <div className="mc-panel group relative flex h-full flex-col overflow-hidden">
        <div className="relative h-40 w-full overflow-hidden" style={{ borderBottom: "3px solid var(--mc-frame)" }}>
          {modpack.logo?.url ? (
            <Image src={modpack.logo.url} alt={modpack.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="400px" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--mc-stone-deep)]">
              <Image src="/images/grass.webp" alt="Default" width={64} height={64} className="pixelated opacity-40" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {modpack.isFeatured && (
            <span className="mc-tag absolute right-2 top-2 flex items-center bg-yellow-500 text-[10px] font-bold text-black px-2 py-0.5">
              <Star className="mr-1 h-3 w-3 fill-black" />
              {t("featured")}
            </span>
          )}

          <span className="mc-tag absolute bottom-2 left-2 flex items-center bg-emerald-600 text-[10px] font-semibold text-white px-2 py-0.5">
            <Download className="mr-1 h-3 w-3" />
            {formatDownloadCount(modpack.downloadCount)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="line-clamp-2 min-h-[2.5rem] font-minecraft text-base font-bold leading-tight text-white group-hover:text-emerald-400">{modpack.name}</h3>

          <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-gray-400">{modpack.summary}</p>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{getLatestVersion()}</span>
          </div>

          <div className="mt-auto flex gap-2">
            <button onClick={() => onSelect?.(modpack)} className="mc-btn mc-btn-emerald flex-1 px-3 py-2 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              {t("selectModpack")}
            </button>
            <button onClick={handleExternalLink} className="mc-btn px-3 py-2">
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ModpackCard);
