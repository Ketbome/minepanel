"use client";

import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { FileBrowser } from "@/components/molecules/FileBrowser";
import { useState } from "react";
import { WorldDiscoverPanel } from "@/components/organisms/world-library/WorldDiscoverPanel";
import { WorldLibraryGrid } from "@/components/organisms/world-library/WorldLibraryGrid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FolderOpen } from "lucide-react";

export default function WorldLibraryPage() {
  const { t } = useLanguage();
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = () => setRefreshToken((value) => value + 1);

  return (
    <div className="space-y-6">
      <div className="mc-panel animate-fade-in-up">
        <div className="mc-titlebar flex items-center gap-3 px-4 py-3">
          <Image src="/images/grass.webp" alt="World Library" width={32} height={32} className="pixelated animate-float" />
          <div>
            <h1 className="text-xl sm:text-2xl font-minecraft text-white drop-shadow-glow leading-tight">{t("worldLibrary")}</h1>
            <p className="text-gray-300 text-xs">{t("worldLibraryDesc")}</p>
          </div>
        </div>
      </div>

      <WorldLibraryGrid refreshToken={refreshToken} />

      <WorldDiscoverPanel onImported={refresh} />

      {/* The raw file browser stays reachable for uploading, renaming and deleting,
          but it is not what you want to look at to find a world. */}
      <Accordion type="single" collapsible className="mc-panel">
        <AccordionItem value="files" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 text-gray-200 font-minecraft text-sm hover:bg-black/25">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-gray-400" />
              {t("manageWorldFiles")}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <FileBrowser key={refreshToken} serverId=".world" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
