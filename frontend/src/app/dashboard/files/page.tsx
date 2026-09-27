"use client";

import { useLanguage } from "@/lib/hooks/useLanguage";
import { FileBrowser } from "@/components/molecules/FileBrowser";
import { PageTitle } from "@/components/molecules/PageTitle";

export default function FilesPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageTitle icon="/images/chest.webp" title={t("openFileBrowser")} description={t("allServersFilesDesc")} />

      <FileBrowser serverId="_root" />
    </div>
  );
}
