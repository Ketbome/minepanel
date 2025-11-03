"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { FolderOpen, ExternalLink, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { env } from "next-runtime-env";

export default function FilesPage() {
  const { t } = useLanguage();
  const [iframeError, setIframeError] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fileBrowserUrl = `${env("NEXT_PUBLIC_FILEBROWSER_URL")}/`;

  const openInNewTab = () => {
    window.open(fileBrowserUrl, "_blank");
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400 font-minecraft flex items-center gap-3">
            <Image src="/images/chest.webp" alt="Files" width={32} height={32} className="opacity-90" />
            {t("openFileBrowser")}
          </h1>
          <p className="text-gray-400 mt-2">{t("filesDesc")}</p>
        </div>
        <Button onClick={openInNewTab} variant="outline" className="gap-2 bg-gray-800/60 border-gray-700/50 text-gray-200 hover:bg-gray-700/40 hover:text-emerald-400 font-minecraft">
          <ExternalLink className="h-4 w-4" />
          {t("openInNewTab")}
        </Button>
      </div>

      <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
        <CardContent className="p-0">
          {iframeError ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] border border-gray-700/50 rounded-md bg-gray-800/50 gap-4 p-6">
              <AlertCircle className="h-16 w-16 text-amber-400 opacity-70" />
              <div className="text-center space-y-2">
                <p className="text-gray-300 font-minecraft text-sm">{t("fileBrowserError")}</p>
                <p className="text-gray-400 text-xs">{t("fileBrowserErrorDesc")}</p>
              </div>
              <Button onClick={openInNewTab} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft mt-2">
                <ExternalLink className="h-4 w-4" />
                {t("openInNewTab")}
              </Button>
            </div>
          ) : (
            <div className="relative border border-gray-700/50 rounded-md overflow-hidden bg-gray-950/80">
              <iframe src={fileBrowserUrl} className="w-full h-[calc(100vh-250px)] bg-white" title="File Browser" onError={() => setIframeError(true)} sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-md">
        <div className="flex items-start gap-3">
          <FolderOpen className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-blue-300 text-sm font-minecraft">{t("fileBrowserTip")}</p>
            <p className="text-blue-200/70 text-xs">{t("fileBrowserTipDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
