import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink, Folder, FolderOpen } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { env } from "next-runtime-env";

interface PluginsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const PluginsTab: FC<PluginsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const isPluginServer = config.serverType === "SPIGOT" || config.serverType === "PAPER" || config.serverType === "BUKKIT" || config.serverType === "PUFFERFISH" || config.serverType === "PURPUR" || config.serverType === "LEAF" || config.serverType === "FOLIA";

  const openFileBrowser = (preferPlugins: boolean = true) => {
    const fileBrowserPath = preferPlugins ? `/files/${config.id}/mc-data/plugins/` : `/files/${config.id}`;

    const url = `${env("NEXT_PUBLIC_FILEBROWSER_URL")}${fileBrowserPath}`;
    window.open(url, "_blank");
  };

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
        {/* Paper specific options */}
        {config.serverType === "PAPER" && (
          <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Image src="/images/diamond.webp" alt="Paper" width={20} height={20} />
              <h3 className="text-emerald-400 font-minecraft text-md">{t("paperConfiguration")}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paperBuild" className="text-gray-200 font-minecraft text-sm">
                  {t("paperBuild")}
                </Label>
                <Input id="paperBuild" value={config.paperBuild || ""} onChange={(e) => updateConfig("paperBuild", e.target.value)} placeholder="140" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
                <p className="text-xs text-gray-400">{t("paperBuildDesc")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paperChannel" className="text-gray-200 font-minecraft text-sm">
                  {t("paperChannel")}
                </Label>
                <Input id="paperChannel" value={config.paperChannel || ""} onChange={(e) => updateConfig("paperChannel", e.target.value)} placeholder="experimental" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
                <p className="text-xs text-gray-400">{t("paperChannelDesc")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paperDownloadUrl" className="text-gray-200 font-minecraft text-sm">
                {t("customDownloadUrl")}
              </Label>
              <Input id="paperDownloadUrl" value={config.paperDownloadUrl || ""} onChange={(e) => updateConfig("paperDownloadUrl", e.target.value)} placeholder="https://..." className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("paperDownloadUrlDesc")}</p>
            </div>
          </div>
        )}

        {/* Bukkit/Spigot specific options */}
        {(config.serverType === "BUKKIT" || config.serverType === "SPIGOT") && (
          <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Image src="/images/gold.webp" alt="Bukkit/Spigot" width={20} height={20} />
              <h3 className="text-emerald-400 font-minecraft text-md">{t("bukkitSpigotConfiguration")}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bukkitDownloadUrl" className="text-gray-200 font-minecraft text-sm">
                {t("bukkitDownloadUrl")}
              </Label>
              <Input id="bukkitDownloadUrl" value={config.bukkitDownloadUrl || ""} onChange={(e) => updateConfig("bukkitDownloadUrl", e.target.value)} placeholder="https://..." className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("bukkitDownloadUrlDesc")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spigotDownloadUrl" className="text-gray-200 font-minecraft text-sm">
                {t("spigotDownloadUrl")}
              </Label>
              <Input id="spigotDownloadUrl" value={config.spigotDownloadUrl || ""} onChange={(e) => updateConfig("spigotDownloadUrl", e.target.value)} placeholder="https://..." className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("spigotDownloadUrlDesc")}</p>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="buildFromSource" checked={config.buildFromSource || false} onChange={(e) => updateConfig("buildFromSource", e.target.checked)} className="rounded border-gray-600 bg-gray-800" />
              <Label htmlFor="buildFromSource" className="text-gray-200 font-minecraft text-sm cursor-pointer">
                {t("buildFromSource")}
              </Label>
            </div>
          </div>
        )}

        {/* Pufferfish specific options */}
        {config.serverType === "PUFFERFISH" && (
          <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Image src="/images/compass.webp" alt="Pufferfish" width={20} height={20} />
              <h3 className="text-emerald-400 font-minecraft text-md">{t("pufferfishConfiguration")}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pufferfishBuild" className="text-gray-200 font-minecraft text-sm">
                {t("pufferfishBuild")}
              </Label>
              <Input id="pufferfishBuild" value={config.pufferfishBuild || ""} onChange={(e) => updateConfig("pufferfishBuild", e.target.value)} placeholder="lastSuccessfulBuild or 47" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("pufferfishBuildDesc")}</p>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="useFlareFlags" checked={config.useFlareFlags || false} onChange={(e) => updateConfig("useFlareFlags", e.target.checked)} className="rounded border-gray-600 bg-gray-800" />
              <Label htmlFor="useFlareFlags" className="text-gray-200 font-minecraft text-sm cursor-pointer">
                {t("useFlareFlags")}
              </Label>
            </div>
          </div>
        )}

        {/* Purpur specific options */}
        {config.serverType === "PURPUR" && (
          <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Image src="/images/enchanted-book.webp" alt="Purpur" width={20} height={20} />
              <h3 className="text-emerald-400 font-minecraft text-md">{t("purpurConfiguration")}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpurBuild" className="text-gray-200 font-minecraft text-sm">
                {t("purpurBuild")}
              </Label>
              <Input id="purpurBuild" value={config.purpurBuild || ""} onChange={(e) => updateConfig("purpurBuild", e.target.value)} placeholder="LATEST or specific build" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("purpurBuildDesc")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpurDownloadUrl" className="text-gray-200 font-minecraft text-sm">
                {t("customDownloadUrl")}
              </Label>
              <Input id="purpurDownloadUrl" value={config.purpurDownloadUrl || ""} onChange={(e) => updateConfig("purpurDownloadUrl", e.target.value)} placeholder="https://..." className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("purpurDownloadUrlDesc")}</p>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="useFlareFlags" checked={config.useFlareFlags || false} onChange={(e) => updateConfig("useFlareFlags", e.target.checked)} className="rounded border-gray-600 bg-gray-800" />
              <Label htmlFor="useFlareFlags" className="text-gray-200 font-minecraft text-sm cursor-pointer">
                {t("useFlareFlags")}
              </Label>
            </div>
          </div>
        )}

        {/* Leaf specific options */}
        {config.serverType === "LEAF" && (
          <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Image src="/images/grass.webp" alt="Leaf" width={20} height={20} />
              <h3 className="text-emerald-400 font-minecraft text-md">{t("leafConfiguration")}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leafBuild" className="text-gray-200 font-minecraft text-sm">
                {t("leafBuild")}
              </Label>
              <Input id="leafBuild" value={config.leafBuild || ""} onChange={(e) => updateConfig("leafBuild", e.target.value)} placeholder="441" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("leafBuildDesc")}</p>
            </div>
          </div>
        )}

        {/* Folia specific options */}
        {config.serverType === "FOLIA" && (
          <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Image src="/images/nether.webp" alt="Folia" width={20} height={20} />
              <h3 className="text-emerald-400 font-minecraft text-md">{t("foliaConfiguration")}</h3>
            </div>

            <div className="bg-amber-900/20 border border-amber-700/30 rounded p-3 mb-4">
              <p className="text-xs text-amber-300">
                <strong>⚠️ Warning:</strong> {t("foliaWarning")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="foliaBuild" className="text-gray-200 font-minecraft text-sm">
                  {t("foliaBuild")}
                </Label>
                <Input id="foliaBuild" value={config.foliaBuild || ""} onChange={(e) => updateConfig("foliaBuild", e.target.value)} placeholder="26" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
                <p className="text-xs text-gray-400">{t("foliaBuildDesc")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foliaChannel" className="text-gray-200 font-minecraft text-sm">
                  {t("foliaChannel")}
                </Label>
                <Input id="foliaChannel" value={config.foliaChannel || ""} onChange={(e) => updateConfig("foliaChannel", e.target.value)} placeholder="experimental" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
                <p className="text-xs text-gray-400">{t("foliaChannelDesc")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foliaDownloadUrl" className="text-gray-200 font-minecraft text-sm">
                {t("customDownloadUrl")}
              </Label>
              <Input id="foliaDownloadUrl" value={config.foliaDownloadUrl || ""} onChange={(e) => updateConfig("foliaDownloadUrl", e.target.value)} placeholder="https://..." className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50" />
              <p className="text-xs text-gray-400">{t("foliaDownloadUrlDesc")}</p>
            </div>
          </div>
        )}

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
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-200 font-minecraft">{t("pluginsManualTitle")}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t("pluginsManualInfo")}</p>

              <div className="mt-3 flex gap-2">
                <Button type="button" onClick={() => openFileBrowser(true)} variant="outline" className="gap-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 border-gray-600 font-minecraft text-xs">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {t("pluginsOpenPluginsFolder")}
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button type="button" onClick={() => openFileBrowser(false)} variant="outline" className="gap-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 border-gray-600 font-minecraft text-xs">
                  <Folder className="h-3.5 w-3.5" />
                  {t("pluginsOpenServerFolder")}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              <ol className="text-xs text-gray-400 mt-3 space-y-1 list-decimal list-inside">
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

        {/* General options for all plugin servers */}
        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="skipDownloadDefaults" checked={config.skipDownloadDefaults || false} onChange={(e) => updateConfig("skipDownloadDefaults", e.target.checked)} className="rounded border-gray-600 bg-gray-800" />
            <Label htmlFor="skipDownloadDefaults" className="text-gray-200 font-minecraft text-sm cursor-pointer">
              {t("skipDownloadDefaults")}
            </Label>
          </div>
          <p className="text-xs text-gray-400">{t("skipDownloadDefaultsDesc")}</p>
        </div>
      </CardContent>
    </Card>
  );
};
