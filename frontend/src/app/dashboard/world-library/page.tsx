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
      <div>
        <h1 className="text-3xl font-bold text-emerald-400 font-minecraft flex items-center gap-3">
          <Image src="/images/grass.webp" alt="World Library" width={32} height={32} className="opacity-90" />
          {t("worldLibrary")}
        </h1>
        <p className="text-gray-400 mt-2">{t("worldLibraryDesc")}</p>
      </div>

      <WorldDiscoverPanel onImported={() => setBrowserKey((value) => value + 1)} />

      <FileBrowser key={browserKey} serverId=".world" />
    </div>
  );
}
