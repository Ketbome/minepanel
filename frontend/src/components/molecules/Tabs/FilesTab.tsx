import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { FileBrowser } from "@/components/molecules/FileBrowser";

interface FilesTabProps {
  serverId: string;
}

export const FilesTab: FC<FilesTabProps> = ({ serverId }) => {
  const { t } = useLanguage();

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/chest.webp" alt="Files" width={24} height={24} className="opacity-90" />
          {t("openFileBrowser")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("filesDesc")}</CardDescription>
      </CardHeader>

      <CardContent>
        <FileBrowser serverId={serverId} />
      </CardContent>
    </Card>
  );
};
