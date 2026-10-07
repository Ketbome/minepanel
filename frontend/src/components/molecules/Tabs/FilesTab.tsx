import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { FileBrowser } from "@/components/molecules/FileBrowser";
import { BookOpen } from "lucide-react";
import { LINK_FILE_MANAGEMENT } from "@/lib/providers/constants";

interface FilesTabProps {
  serverId: string;
  minecraftVersion?: string;
  bedrock?: boolean;
}

export const FilesTab: FC<FilesTabProps> = ({ serverId, minecraftVersion, bedrock }) => {
  const { t } = useLanguage();

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
              <Image src="/images/chest.webp" alt="Files" width={24} height={24} className="opacity-90" />
              {t("openFileBrowser")}
            </CardTitle>
            <CardDescription className="text-gray-300">{t("filesDesc")}</CardDescription>
          </div>
          <a href={LINK_FILE_MANAGEMENT} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <BookOpen className="h-4 w-4" />
            {t("documentation")}
          </a>
        </div>
      </CardHeader>

      <CardContent>
        <FileBrowser serverId={serverId} minecraftVersion={minecraftVersion} bedrock={bedrock} />
      </CardContent>
    </Card>
  );
};
