"use client";

import { useLanguage } from "@/lib/hooks/useLanguage";
import { FileBrowser } from "@/components/molecules/FileBrowser";
import { useState } from "react";
import { WorldDiscoverPanel } from "@/components/organisms/world-library/WorldDiscoverPanel";
import { WorldLibraryGrid } from "@/components/organisms/world-library/WorldLibraryGrid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FolderOpen } from "lucide-react";
import { PageTitle } from "@/components/molecules/PageTitle";

export default function WorldLibraryPage() {
  const { t } = useLanguage();
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = () => setRefreshToken((value) => value + 1);

  return (
    <div className="space-y-6">
      <PageTitle icon="/images/grass.webp" title={t("worldLibrary")} description={t("worldLibraryDesc")} />

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
