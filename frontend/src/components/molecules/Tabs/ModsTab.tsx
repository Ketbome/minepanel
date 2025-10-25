import { FC, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Info, HelpCircle, Eye, EyeOff } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";

interface ModsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ModsTab: FC<ModsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const [showApiKeyManual, setShowApiKeyManual] = useState(false);
  const [showApiKeyAuto, setShowApiKeyAuto] = useState(false);
  const isCurseForge = config.serverType === "AUTO_CURSEFORGE";
  const isManualCurseForge = config.serverType === "CURSEFORGE";
  const isForge = config.serverType === "FORGE";

  if (!isCurseForge && !isForge && !isManualCurseForge) {
    return (
      <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
            <Image src="/images/gold.webp" alt="Mods" width={24} height={24} className="opacity-90" />
            {t("modsConfig")}
          </CardTitle>
          <CardDescription className="text-gray-300">{t("modsNotAvailable")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 border border-gray-700/50 rounded-md bg-gray-800/50 gap-3 p-6">
            <Image src="/images/crafting-table.webp" alt="Mods" width={48} height={48} className="opacity-80" />
            <p className="text-gray-400 text-center font-minecraft text-sm">{t("modsSelectServerType")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/gold.webp" alt="Mods" width={24} height={24} className="opacity-90" />
          {t("modsConfig")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("modsConfigDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isForge && (
          <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <Label htmlFor="forgeBuild" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/anvil.webp" alt="Forge" width={16} height={16} />
              {t("forgeVersion")}
            </Label>
            <Input id="forgeBuild" value={config.forgeBuild} onChange={(e) => updateConfig("forgeBuild", e.target.value)} placeholder="43.2.0" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
            <p className="text-xs text-gray-400">{t("forgeBuildDesc")}</p>
          </div>
        )}

        {isManualCurseForge && (
          <>
            <div className="bg-amber-900/30 border border-amber-700/30 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300 font-minecraft">{t("deprecatedFeature")}</p>
                  <p className="text-xs text-amber-200/80 mt-1">{t("manualCurseForgeDeprecated")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfServerMod" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/chest.webp" alt="Modpack" width={16} height={16} />
                  {t("modpackFile")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("modpackFileHelp")}</p>
                      <p className="mt-1 text-xs">{t("modpackFileExample")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="cfServerMod" value={config.cfServerMod || ""} onChange={(e) => updateConfig("cfServerMod", e.target.value)} placeholder="/modpacks/SkyFactory_4_Server_4.1.0.zip" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">{t("modpackFilePath")}</p>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfBaseDir" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/ender_chest.webp" alt="Directorio" width={16} height={16} />
                  {t("baseDirectory")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("baseDirectoryHelp")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="cfBaseDir" value={config.cfBaseDir || "/data/FeedTheBeast"} onChange={(e) => updateConfig("cfBaseDir", e.target.value)} placeholder="/data/FeedTheBeast" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">{t("baseDirectoryPath")}</p>
            </div>

            <div className="space-y-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="useModpackStartScript" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/command-block.webp" alt="Script" width={16} height={16} />
                  {t("useModpackStartScript")}
                </Label>
                <Switch id="useModpackStartScript" checked={config.useModpackStartScript ?? true} onCheckedChange={(checked) => updateConfig("useModpackStartScript", checked)} />
              </div>
              <p className="text-xs text-gray-400">{t("useModpackStartScriptDesc")}</p>
            </div>

            <div className="space-y-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="ftbLegacyJavaFixer" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/redstone.webp" alt="Java Fixer" width={16} height={16} />
                  {t("ftbLegacyJavaFixer")}
                </Label>
                <Switch id="ftbLegacyJavaFixer" checked={config.ftbLegacyJavaFixer ?? false} onCheckedChange={(checked) => updateConfig("ftbLegacyJavaFixer", checked)} />
              </div>
              <p className="text-xs text-gray-400">{t("ftbLegacyJavaFixerDesc")}</p>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfApiKeyManual" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} />
                  {t("cfApiKey")}
                </Label>
              </div>
              <div className="relative">
                <Input id="cfApiKeyManual" value={config.cfApiKey || ""} onChange={(e) => updateConfig("cfApiKey", e.target.value)} placeholder="$2a$10$Iao..." type={showApiKeyManual ? "text" : "password"} className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowApiKeyManual(!showApiKeyManual)}>
                  {showApiKeyManual ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400">{t("cfApiKeyOptional")}</p>
              <p className="text-xs text-amber-300 mt-1 font-minecraft" dangerouslySetInnerHTML={{ __html: t("cfApiKeyDollarWarning") }} />
            </div>
          </>
        )}

        {isCurseForge && (
          <>
            <div className="bg-amber-900/30 border border-amber-700/30 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300 font-minecraft">{t("importantInfo")}</p>
                  <p className="text-xs text-amber-200/80 mt-1">{t("cfApiKeyRequired")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfMethod" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/compass.webp" alt="Método" width={16} height={16} />
                  {t("installationMethod")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("installationMethodHelp")}</p>
                      <ul className="list-disc pl-4 mt-1 text-xs">
                        <li>
                          <strong>{t("methodUrl")}:</strong> {t("methodUrlDesc")}
                        </li>
                        <li>
                          <strong>{t("methodSlug")}:</strong> {t("methodSlugDesc")}
                        </li>
                        <li>
                          <strong>{t("methodFile")}:</strong> {t("methodFileDesc")}
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div className={`p-4 border rounded-md cursor-pointer transition-colors hover:bg-gray-700/30 ${config.cfMethod === "url" ? "border-emerald-500/50 bg-emerald-600/10" : "border-gray-700/50"}`} onClick={() => updateConfig("cfMethod", "url")}>
                  <p className="font-minecraft text-sm text-gray-200">{t("methodUrl")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("installFromUrl")}</p>
                </div>
                <div className={`p-4 border rounded-md cursor-pointer transition-colors hover:bg-gray-700/30 ${config.cfMethod === "slug" ? "border-emerald-500/50 bg-emerald-600/10" : "border-gray-700/50"}`} onClick={() => updateConfig("cfMethod", "slug")}>
                  <p className="font-minecraft text-sm text-gray-200">{t("methodSlug")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("useIdSlug")}</p>
                </div>
                <div className={`p-4 border rounded-md cursor-pointer transition-colors hover:bg-gray-700/30 ${config.cfMethod === "file" ? "border-emerald-500/50 bg-emerald-600/10" : "border-gray-700/50"}`} onClick={() => updateConfig("cfMethod", "file")}>
                  <p className="font-minecraft text-sm text-gray-200">{t("methodFile")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("useLocalFile")}</p>
                </div>
              </div>
            </div>

            {config.cfMethod === "url" && (
              <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cfUrl" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                    <Image src="/images/ender-pearl.webp" alt="URL" width={16} height={16} />
                    {t("modpackUrl")}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>{t("modpackUrlHelp")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input id="cfUrl" value={config.cfUrl} onChange={(e) => updateConfig("cfUrl", e.target.value)} placeholder="https://www.curseforge.com/minecraft/modpacks/all-the-mods-7/download/3855588" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                <p className="text-xs text-gray-400">{t("modpackUrlDesc")}</p>
              </div>
            )}

            {config.cfMethod === "slug" && (
              <>
                <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cfSlug" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                      <Image src="/images/nether.webp" alt="Slug" width={16} height={16} />
                      {t("curseForgeProject")}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t("curseForgeProjectHelp")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input id="cfSlug" value={config.cfSlug} onChange={(e) => updateConfig("cfSlug", e.target.value)} placeholder="all-the-mods-7" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                  <p className="text-xs text-gray-400">{t("projectNameOrSlug")}</p>
                </div>

                <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cfFile" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                      <Image src="/images/paper.webp" alt="ID" width={16} height={16} />
                      {t("fileId")}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>{t("fileIdHelp")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input id="cfFile" value={config.cfFile} onChange={(e) => updateConfig("cfFile", e.target.value)} placeholder="3855588" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                  <p className="text-xs text-gray-400">{t("fileIdDesc")}</p>
                </div>
              </>
            )}

            {config.cfMethod === "file" && (
              <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cfFilenameMatcher" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                    <Image src="/images/book.webp" alt="Archivo" width={16} height={16} />
                    {t("filePattern")}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>{t("filePatternHelp")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input id="cfFilenameMatcher" value={config.cfFilenameMatcher} onChange={(e) => updateConfig("cfFilenameMatcher", e.target.value)} placeholder="*.zip" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                <p className="text-xs text-gray-400">{t("filePatternDesc")}</p>
              </div>
            )}

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfApiKey" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} />
                  {t("cfApiKey")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("cfApiKeyHelp")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input id="cfApiKey" value={config.cfApiKey} onChange={(e) => updateConfig("cfApiKey", e.target.value)} placeholder="$2a$10$Iao..." type={showApiKeyAuto ? "text" : "password"} className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowApiKeyAuto(!showApiKeyAuto)}>
                  {showApiKeyAuto ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400">{t("cfApiKeyDesc")}</p>
              <p className="text-xs text-amber-300 mt-1 font-minecraft" dangerouslySetInnerHTML={{ __html: t("cfApiKeyDollarWarning") }} />
            </div>

            <Accordion type="single" collapsible className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md">
              <AccordionItem value="advanced" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-gray-200 font-minecraft text-sm hover:bg-gray-700/30 rounded-t-md">
                  <div className="flex items-center gap-2">
                    <Image src="/images/compass.webp" alt="Avanzado" width={16} height={16} />
                    {t("advancedOptions")}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfSync" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/observer.webp" alt="Sincronizar" width={16} height={16} />
                        {t("synchronizeCurseForge")}
                      </Label>
                      <Switch id="cfSync" checked={config.cfSync} onCheckedChange={(checked) => updateConfig("cfSync", checked)} />
                    </div>
                    <p className="text-xs text-gray-400">{t("synchronizeCurseForgeDesc")}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfParallelDownloads" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/hopper.webp" alt="Descargas" width={16} height={16} />
                        {t("parallelDownloads")}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <p>{t("parallelDownloadsHelp")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={config.cfParallelDownloads || "4"} onValueChange={(value) => updateConfig("cfParallelDownloads", value)}>
                      <SelectTrigger className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30">
                        <SelectValue placeholder="4" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-gray-200 ">
                        <SelectItem value="1">{t("download1")}</SelectItem>
                        <SelectItem value="2">{t("download2")}</SelectItem>
                        <SelectItem value="4">{t("download4")}</SelectItem>
                        <SelectItem value="6">{t("download6")}</SelectItem>
                        <SelectItem value="8">{t("download8")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{t("parallelDownloadsDesc")}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfOverridesSkipExisting" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/redstone.webp" alt="Omitir" width={16} height={16} />
                        {t("skipExistingFiles")}
                      </Label>
                      <Switch id="cfOverridesSkipExisting" checked={config.cfOverridesSkipExisting} onCheckedChange={(checked) => updateConfig("cfOverridesSkipExisting", checked)} />
                    </div>
                    <p className="text-xs text-gray-400">{t("skipExistingFilesDesc")}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfSetLevelFrom" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/elytra.webp" alt="Nivel" width={16} height={16} />
                        {t("setLevelFrom")}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <p>{t("setLevelFromHelp")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={config.cfSetLevelFrom || "none"} onValueChange={(value) => updateConfig("cfSetLevelFrom", value === "none" ? "" : value)}>
                      <SelectTrigger className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30">
                        <SelectValue placeholder={t("doNotSet")} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-gray-200 border-gray-700">
                        <SelectItem value="none">{t("doNotSet")}</SelectItem>
                        <SelectItem value="WORLD_FILE">{t("worldFile")}</SelectItem>
                        <SelectItem value="OVERRIDES">{t("modpackOverrides")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{t("setLevelFromDesc")}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfForceInclude" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/chest.webp" alt="Incluir" width={16} height={16} />
                        {t("forceIncludeMods")}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                            <p>{t("forceIncludeModsHelp")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea id="cfForceInclude" value={config.cfForceInclude} onChange={(e) => updateConfig("cfForceInclude", e.target.value)} placeholder="699872,228404" className="min-h-20 bg-gray-800/70 border-gray-700/50 text-gray-200 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                    <p className="text-xs text-gray-400">{t("forceIncludeModsDesc")}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfExclude" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/barrier.webp" alt="Excluir" width={16} height={16} />
                        {t("excludeMods")}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                            <p>{t("excludeModsHelp")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea id="cfExclude" value={config.cfExclude} onChange={(e) => updateConfig("cfExclude", e.target.value)} placeholder="699872,228404" className="min-h-20 text-gray-200 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                    <p className="text-xs text-gray-400">{t("excludeModsDesc")}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
};
