"use client";

import { FC } from "react";
import Image from "next/image";
import { ExternalLink, FileArchive, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { LINK_MODPACK_NO_LOADER, LINK_MODPACK_ZIP } from "@/lib/providers/constants";

interface ModpackNotFoundHelpProps {
  /** What was typed; used for the CurseForge search link. Empty means "nothing was searched". */
  readonly query?: string;
  /** Offered only where a server already exists to install into. */
  readonly onUseZip?: () => void;
}

const CURSEFORGE_SEARCH = "https://www.curseforge.com/minecraft/search?class=modpacks&search=";

export const ModpackNotFoundHelp: FC<ModpackNotFoundHelpProps> = ({ query, onUseZip }) => {
  const { t } = useLanguage();
  const trimmed = query?.trim();

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Image src="/images/barrier.webp" alt="" width={56} height={56} className="pixelated opacity-60" />
      <div className="space-y-1">
        <p className="font-minecraft text-sm text-gray-300">{t("noModpacksFound")}</p>
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-gray-400">{t("modpackNotFoundIntro")}</p>
      </div>

      <ol className="mx-auto max-w-xl space-y-2 text-left text-xs leading-relaxed text-gray-400">
        <li className="border-2 border-[var(--mc-frame)] bg-gray-900/50 p-3">
          <span className="font-minecraft text-[11px] uppercase text-emerald-400">1. </span>
          {t("modpackNotFoundPasteUrl")}
        </li>
        <li className="border-2 border-[var(--mc-frame)] bg-gray-900/50 p-3">
          <span className="font-minecraft text-[11px] uppercase text-emerald-400">2. </span>
          {t("modpackNotFoundUseZip")}{" "}
          <a href={LINK_MODPACK_ZIP} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline-offset-2 hover:underline">
            {t("documentation")}
          </a>
        </li>
        <li className="border-2 border-[var(--mc-frame)] bg-gray-900/50 p-3">
          <span className="font-minecraft text-[11px] uppercase text-emerald-400">3. </span>
          {t("modpackNotFoundPickLoader")}{" "}
          <a href={LINK_MODPACK_NO_LOADER} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline-offset-2 hover:underline">
            {t("documentation")}
          </a>
        </li>
      </ol>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {onUseZip && (
          <Button type="button" onClick={onUseZip} className="h-9 font-minecraft text-xs">
            <FileArchive className="mr-1.5 h-3.5 w-3.5" />
            {t("modpackNotFoundZipAction")}
          </Button>
        )}
        <Button asChild type="button" variant="outline" className="h-9 font-minecraft text-xs">
          <a href={`${CURSEFORGE_SEARCH}${encodeURIComponent(trimmed ?? "")}`} target="_blank" rel="noopener noreferrer">
            <Search className="mr-1.5 h-3.5 w-3.5" />
            {t("modpackNotFoundSearchOnCurseForge")}
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
};
