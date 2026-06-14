"use client";

import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { FileBrowser } from "@/components/molecules/FileBrowser";

export default function FilesPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="mc-panel animate-fade-in-up">
        <div className="mc-titlebar flex items-center gap-3 px-4 py-3">
          <Image src="/images/chest.webp" alt="Files" width={32} height={32} className="pixelated animate-float" />
          <div>
            <h1 className="text-xl sm:text-2xl font-minecraft text-white drop-shadow-glow leading-tight">{t("openFileBrowser")}</h1>
            <p className="text-gray-300 text-xs">{t("allServersFilesDesc")}</p>
          </div>
        </div>
      </div>

      <FileBrowser serverId="_root" />
    </div>
  );
}
