import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerConfig } from "@/lib/types/types";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { MemoryCpuTab } from "./ResourcesTabs/MemoryCpuTab";
import { JvmOptionsTab } from "./ResourcesTabs/JvmOptionsTab";
import { LINK_ADVANCED_CONFIGURATION } from "@/lib/providers/constants";

interface ResourcesTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ResourcesTab: FC<ResourcesTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
              <Image src="/images/diamond-pickaxe.webp" alt={t("serverResources")} width={24} height={24} className="opacity-90" />
              {t("serverResources")}
            </CardTitle>
            <CardDescription className="text-gray-300">{t("serverResourcesDesc")}</CardDescription>
          </div>
          <a href={LINK_ADVANCED_CONFIGURATION} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <BookOpen className="h-4 w-4" />
            {t("documentation")}
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 text-gray-200">
        <div className="space-y-4">
          <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
            <Image src="/images/emerald.webp" alt={t("memoryCpu")} width={20} height={20} />
            {t("memoryCpu")}
          </h3>
          <MemoryCpuTab config={config} updateConfig={updateConfig} />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
            <Image src="/images/diamond.webp" alt={t("jvmOptions")} width={20} height={20} />
            {t("jvmOptions")}
          </h3>
          <JvmOptionsTab config={config} updateConfig={updateConfig} />
        </div>
      </CardContent>
    </Card>
  );
};
