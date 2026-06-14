"use client";

import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { FileBrowser } from "@/components/molecules/FileBrowser";
import { useState } from "react";
import { WorldDiscoverPanel } from "@/components/organisms/world-library/WorldDiscoverPanel";

export default function WorldLibraryPage() {
  const { t } = useLanguage();
  const [browserKey, setBrowserKey] = useState(0);

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

      <WorldDiscoverPanel onImported={() => setBrowserKey((value) => value + 1)} />

      <FileBrowser key={browserKey} serverId=".world" />
    </div>
  );
}
