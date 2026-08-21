"use client";

import Image from "next/image";
import { Download, Calendar, ExternalLink, Star } from "lucide-react";
import { CurseForgeModpack, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { FC, memo } from "react";

interface ModpackCardProps {
  readonly modpack: CurseForgeModpack;
  // Required: the whole card is a click target, so a card without a handler would
  // be a focusable control that does nothing.
  readonly onSelect: (modpack: CurseForgeModpack) => void;
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
    <div className="h-full animate-fade-in-up transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mc-panel group h-full">
        {/* `.mc-panel > *` forces position: relative, so the stretched click
            target has to live one level deeper to stay absolute. */}
        <div className="relative flex h-full items-start gap-4 p-4">
          <button
            type="button"
            onClick={() => onSelect(modpack)}
            aria-label={`${t("selectModpack")}: ${modpack.name}`}
            className="absolute inset-0 cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--mc-emerald)]"
          />

          {/* CurseForge artwork is square; a square box shows all of it. */}
          {modpack.logo?.url ? (
            <Image
              src={modpack.logo.url}
              alt={modpack.name}
              width={96}
              height={96}
              sizes="96px"
              className="h-20 w-20 shrink-0 border-2 border-[var(--mc-frame)] object-cover sm:h-24 sm:w-24"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center border-2 border-[var(--mc-frame)] bg-[var(--mc-stone-deep)] sm:h-24 sm:w-24">
              <Image src="/images/grass.webp" alt="Default" width={40} height={40} className="pixelated opacity-40" />
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
            <div className="flex items-start gap-2">
              <h3 className="line-clamp-2 flex-1 font-minecraft text-sm font-bold leading-tight text-white group-hover:text-emerald-400">{modpack.name}</h3>
              {modpack.isFeatured && (
                <span className="mc-tag flex shrink-0 items-center bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                  <Star className="mr-1 h-3 w-3 fill-black" />
                  {t("featured")}
                </span>
              )}
            </div>

            <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">{modpack.summary}</p>

            <div className="mt-auto flex flex-wrap items-center gap-1.5">
              <span className="mc-tag flex items-center bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <Download className="mr-1 h-3 w-3" />
                {formatDownloadCount(modpack.downloadCount)}
              </span>
              <span className="mc-tag flex items-center bg-[var(--mc-stone-deep)] px-1.5 py-0.5 text-[10px] font-semibold text-gray-300">
                <Calendar className="mr-1 h-3 w-3" />
                {getLatestVersion()}
              </span>
              <button onClick={handleExternalLink} aria-label={`${t("viewOnCurseForge")}: ${modpack.name}`} className="mc-btn relative ml-auto px-2 py-1">
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ModpackCard);
