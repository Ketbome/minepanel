import { FC, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { FolderOpen, ExternalLink, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { env } from "next-runtime-env";

interface FilesTabProps {
  serverId: string;
}

export const FilesTab: FC<FilesTabProps> = ({ serverId }) => {
  const { t } = useLanguage();
  const [iframeError, setIframeError] = useState(false);

  const fileBrowserUrl = `${env("NEXT_PUBLIC_FILEBROWSER_URL")}/files/${serverId}`;

  const openInNewTab = () => {
    window.open(fileBrowserUrl, "_blank");
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
              <Image src="/images/chest.webp" alt="Files" width={24} height={24} className="opacity-90" />
              {t("openFileBrowser")}
            </CardTitle>
            <CardDescription className="text-gray-300">{t("filesDesc")}</CardDescription>
          </div>
          <Button onClick={openInNewTab} variant="outline" size="sm" className="gap-2 bg-gray-800/60 border-gray-700/50 text-gray-200 hover:bg-gray-700/40 hover:text-emerald-400 font-minecraft">
            <ExternalLink className="h-4 w-4" />
            {t("openInNewTab")}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {iframeError ? (
          <div className="flex flex-col items-center justify-center h-[600px] border border-gray-700/50 rounded-md bg-gray-800/50 gap-4 p-6">
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
            <iframe src={fileBrowserUrl} className="w-full h-[600px] bg-white" title="File Browser" onError={() => setIframeError(true)} sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups" />
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-md">
          <div className="flex items-start gap-2">
            <FolderOpen className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-blue-300 text-xs font-minecraft">{t("fileBrowserTip")}</p>
              <p className="text-blue-200/70 text-xs">{t("fileBrowserTipDesc")}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
