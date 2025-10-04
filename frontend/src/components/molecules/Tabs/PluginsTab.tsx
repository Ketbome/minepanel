/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, HelpCircle } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";

interface PluginsTabProps {
  config: ServerConfig;
  updateConfig: (field: keyof ServerConfig, value: any) => void;
  onSave: () => Promise<boolean>;
}

export const PluginsTab: FC<PluginsTabProps> = ({ config, updateConfig, onSave }) => {
  const { t } = useLanguage();
  const isPluginServer = config.serverType === "SPIGOT" || config.serverType === "PAPER" || config.serverType === "BUKKIT" || config.serverType === "PUFFERFISH" || config.serverType === "PURPUR" || config.serverType === "LEAF" || config.serverType === "FOLIA";

  if (!isPluginServer) {
    return (
      <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
            <Image src="/images/emerald.webp" alt="Plugins" width={24} height={24} className="opacity-90" />
            {t("pluginsConfig")}
          </CardTitle>
          <CardDescription className="text-gray-300">{t("pluginsNotAvailable")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 border border-gray-700/50 rounded-md bg-gray-800/50 gap-3 p-6">
            <Image src="/images/command-block.webp" alt="Plugins" width={48} height={48} className="opacity-80" />
            <p className="text-gray-400 text-center font-minecraft text-sm">{t("pluginsSelectServerType")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/emerald.webp" alt="Plugins" width={24} height={24} className="opacity-90" />
          {t("pluginsConfig")}
        </CardTitle>
        <CardDescription className="text-gray-300">
          {t("pluginsConfigDesc")} {config.serverType}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-blue-900/30 border border-blue-700/30 rounded-md p-4">
          <div className="flex items-start gap-3">
            <Image src="/images/enchanted-book.webp" alt="Info" width={20} height={20} className="flex-shrink-0 mt-0.5 opacity-90" />
            <div>
              <p className="text-sm font-medium text-blue-300 font-minecraft">{t("pluginsAutoDownload")}</p>
              <p className="text-xs text-blue-200/80 mt-1">{t("pluginsAutoDownloadDesc")}</p>
              <p className="text-xs text-blue-200/80 mt-2">{t("pluginsManualInfo")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="spigetResources" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/redstone.webp" alt="Spiget" width={16} height={16} />
              {t("pluginsSpigetResources")}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                  <p className="font-medium mb-2">{t("pluginsSpigetResourcesDesc")}</p>
                  <p className="text-xs mb-2">The ID is found in the resource URL:</p>
                  <p className="text-xs font-mono bg-gray-900/60 p-2 rounded mb-2">
                    spigotmc.org/resources/luckperms.<span className="text-emerald-400 font-bold">28140</span>/
                  </p>
                  <p className="text-xs text-amber-300">{t("pluginsSpigetWarning")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input id="spigetResources" value={config.spigetResources || ""} onChange={(e) => updateConfig("spigetResources", e.target.value)} placeholder="28140,34315" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
          <p className="text-xs text-gray-400">{t("pluginsSpigetResourcesDesc")}</p>
          <div className="mt-3 p-3 bg-amber-900/20 border border-amber-700/30 rounded">
            <p className="text-xs text-amber-300">{t("pluginsSpigetNote")}</p>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/30 rounded-md p-4">
          <div className="flex items-start gap-3">
            <Image src="/images/chest.webp" alt="File Browser" width={20} height={20} className="flex-shrink-0 mt-0.5 opacity-90" />
            <div>
              <p className="text-sm font-medium text-gray-200 font-minecraft">{t("pluginsManualTitle")}</p>
              <p className="text-xs text-gray-400 mt-1">{t("pluginsManualInfo")}</p>
              <ol className="text-xs text-gray-400 mt-2 space-y-1 list-decimal list-inside">
                <li>{t("pluginsManualStep1")}</li>
                <li>{t("pluginsManualStep2")}</li>
                <li>{t("pluginsManualStep3")}</li>
                <li>{t("pluginsManualStep4")}</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-md p-4">
          <div className="flex items-start gap-3">
            <Image src="/images/golden-apple.webp" alt="Tips" width={20} height={20} className="flex-shrink-0 mt-0.5 opacity-90" />
            <div>
              <p className="text-sm font-medium text-emerald-300 font-minecraft">{t("pluginsTipsTitle")}</p>
              <ul className="text-xs text-emerald-200/80 mt-2 space-y-1 list-disc list-inside">
                <li>{t("pluginsTip1")}</li>
                <li>{t("pluginsTip2")}</li>
                <li>{t("pluginsTip3")}</li>
                <li>{t("pluginsTip4")}</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end pt-4 border-t border-gray-700/40">
        <Button type="button" onClick={onSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
          <Save className="h-4 w-4" />
          {t("pluginsSave")}
        </Button>
      </CardFooter>
    </Card>
  );
};
