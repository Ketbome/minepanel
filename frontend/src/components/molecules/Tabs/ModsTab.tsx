import { FC, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Info, HelpCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { ServerConfig } from "@/lib/types/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useMinecraftVersions } from "@/lib/hooks/useMinecraftVersions";
import Image from "next/image";
import { LINK_MODS_PLUGINS } from "@/lib/providers/constants";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { CurseForgeModpack } from "@/services/curseforge/curseforge.service";
import { ModsBrowserDialog } from "@/components/molecules/mods/ModsBrowserDialog";
import { ModsListEditor } from "@/components/molecules/mods/ModsListEditor";
import { ModpackFilePicker } from "@/components/molecules/ModpackFilePicker";
import { CurseForgeModpackSection } from "@/components/molecules/modpacks/CurseForgeModpackSection";
import { ModLoader, ModProvider, ModSearchItem } from "@/services/mods/mods-browser.service";
import { findModEntryIndex, parseModEntries, serializeModEntries } from "@/lib/utils/mod-entries";

const ModpackBrowser = dynamic(() => import("@/components/molecules/modpacks/ModpackBrowser").then(mod => mod.ModpackBrowser), {
  ssr: false,
});

interface ModsTabProps {
  serverId: string;
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ModsTab: FC<ModsTabProps> = ({ serverId, config, updateConfig }) => {
  const { t } = useLanguage();
  const [showModpackBrowser, setShowModpackBrowser] = useState(false);
  const [showModsBrowser, setShowModsBrowser] = useState(false);
  const [modsBrowserProvider, setModsBrowserProvider] = useState<ModProvider>("curseforge");
  const [modsTargetField, setModsTargetField] = useState<"cfFiles" | "modrinthProjects">("cfFiles");
  const isCurseForge = config.serverType === "AUTO_CURSEFORGE";
  const isManualCurseForge = config.serverType === "CURSEFORGE";
  const isModrinth = config.serverType === "MODRINTH";
  const isGtnh = config.serverType === "GTNH";
  const isFtba = config.serverType === "FTBA";
  const isForge = config.serverType === "FORGE";
  const isNeoforge = config.serverType === "NEOFORGE";
  const isFabric = config.serverType === "FABRIC";
  const { latestRelease } = useMinecraftVersions({ filterType: "release" });
  // itzg resolves "latest" inside the container, so the panel has to guess it to
  // filter mods. Without a guess the providers return every Minecraft version.
  const effectiveMinecraftVersion = useMemo(() => {
    const current = config.minecraftVersion || "";
    return current.toLowerCase() === "latest" && latestRelease ? latestRelease : current;
  }, [config.minecraftVersion, latestRelease]);
  const resolvedLoader = useMemo<ModLoader | undefined>(() => {
    if (config.serverType === "FORGE") return "forge";
    if (config.serverType === "NEOFORGE") return "neoforge";
    if (config.serverType === "FABRIC") return "fabric";
    if (config.serverType === "QUILT") return "quilt";

    const customLoader = (config.modrinthLoader || "").toLowerCase();
    if (customLoader === "forge" || customLoader === "neoforge" || customLoader === "fabric" || customLoader === "quilt") {
      return customLoader;
    }
    return undefined;
  }, [config.serverType, config.modrinthLoader]);

  const handleModpackSelect = (modpack: CurseForgeModpack) => {
    if (config.cfMethod === "url") {
      updateConfig("cfUrl", modpack.links.websiteUrl);
    } else if (config.cfMethod === "slug") {
      updateConfig("cfSlug", modpack.slug);
      if (modpack.latestFiles?.[0]?.id) {
        updateConfig("cfFile", modpack.latestFiles[0].id.toString());
      }
    }
    mcToast.success(`${t("modpackSelected")}: ${modpack.name}`);
  };

  const openModsBrowser = (provider: ModProvider, field: "cfFiles" | "modrinthProjects") => {
    setModsBrowserProvider(provider);
    setModsTargetField(field);
    setShowModsBrowser(true);
  };

  const currentModEntries = () => parseModEntries(String(config[modsTargetField] || ""), modsTargetField === "modrinthProjects" ? "modrinth" : "curseforge");

  const isModAlreadyAdded = (mod: ModSearchItem): boolean =>
    findModEntryIndex(currentModEntries(), [mod.slug, mod.projectId]) >= 0;

  const toggleModFromBrowser = (mod: ModSearchItem, insertAs: "slug" | "id", version?: string): "added" | "removed" | "noop" => {
    const entries = currentModEntries();
    const index = findModEntryIndex(entries, [mod.slug, mod.projectId]);

    if (index >= 0) {
      updateConfig(modsTargetField, serializeModEntries(entries.filter((_, entryIndex) => entryIndex !== index)));
      return "removed";
    }

    const ref = insertAs === "id" ? mod.projectId : mod.slug;
    updateConfig(modsTargetField, serializeModEntries([...entries, { raw: ref, ref, version, separator: ":", optional: false, opaque: false }]));
    return "added";
  };

  if (!isCurseForge && !isForge && !isNeoforge && !isManualCurseForge && !isFabric && !isModrinth && !isGtnh && !isFtba) {
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
              <Image src="/images/gold.webp" alt="Mods" width={24} height={24} className="opacity-90" />
              {t("modsConfig")}
            </CardTitle>
            <CardDescription className="text-gray-300">{t("modsConfigDesc")}</CardDescription>
          </div>
          <a href={LINK_MODS_PLUGINS} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <BookOpen className="h-4 w-4" />
            Docs
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isForge && (
          <>
            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Label htmlFor="forgeBuild" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                <Image src="/images/anvil.webp" alt="Forge" width={16} height={16} />
                {t("forgeVersion")}
              </Label>
              <Input id="forgeBuild" value={config.forgeBuild} onChange={(e) => updateConfig("forgeBuild", e.target.value)} placeholder="43.2.0" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">{t("forgeBuildDesc")}</p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} className="mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                {t("cfApiKeyFromSettings")}{" "}
                <Link href="/dashboard/settings/integrations" className="text-emerald-400 hover:text-emerald-300 underline">
                  {t("settings")}
                </Link>
              </p>
            </div>

            <ModsListEditor
              id="cfFiles"
              provider="curseforge"
              accent="emerald"
              icon="/images/ender_chest.webp"
              label={t("curseforgeFiles")}
              description={t("curseforgeFilesDesc")}
              helpText={t("curseforgeFilesHelp")}
              placeholder="jei, geckolib, aquaculture"
              browseUrl="https://www.curseforge.com/minecraft/search?page=1&pageSize=20&sortBy=relevancy&class=mc-mods"
              value={config.cfFiles || ""}
              minecraftVersion={effectiveMinecraftVersion}
              loader={resolvedLoader}
              onChange={(value) => updateConfig("cfFiles", value)}
              onSearch={() => openModsBrowser("curseforge", "cfFiles")}
            />
          </>
        )}

        {isNeoforge && (
          <>
            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Label htmlFor="neoforgeBuild" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                <Image src="/images/neoforged.png" alt="Forge" width={16} height={16} />
                {t("neoforgeVersion")}
              </Label>
              <Input id="neoforgeBuild" value={config.neoforgeBuild} onChange={(e) => updateConfig("neoforgeBuild", e.target.value)} placeholder="21.1.219" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">{t("neoforgeBuildDesc")}</p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} className="mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                {t("cfApiKeyFromSettings")}{" "}
                <Link href="/dashboard/settings/integrations" className="text-emerald-400 hover:text-emerald-300 underline">
                  {t("settings")}
                </Link>
              </p>
            </div>

            <ModsListEditor
              id="cfFiles"
              provider="curseforge"
              accent="emerald"
              icon="/images/ender_chest.webp"
              label={t("curseforgeFiles")}
              description={t("curseforgeFilesDesc")}
              helpText={t("curseforgeFilesHelp")}
              placeholder="jei, geckolib, aquaculture"
              browseUrl="https://www.curseforge.com/minecraft/search?page=1&pageSize=20&sortBy=relevancy&class=mc-mods"
              value={config.cfFiles || ""}
              minecraftVersion={effectiveMinecraftVersion}
              loader={resolvedLoader}
              onChange={(value) => updateConfig("cfFiles", value)}
              onSearch={() => openModsBrowser("curseforge", "cfFiles")}
            />
          </>
        )}

        {isFabric && (
          <>
            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Label htmlFor="fabricLoaderVersion" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                <Image src="/images/crafting-table.webp" alt="Fabric Loader" width={16} height={16} />
                {t("fabricLoaderVersion")}
              </Label>
              <Input id="fabricLoaderVersion" value={config.fabricLoaderVersion || ""} onChange={(e) => updateConfig("fabricLoaderVersion", e.target.value)} placeholder="0.13.1" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">{t("fabricLoaderDesc")}</p>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Label htmlFor="fabricLauncherVersion" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                <Image src="/images/compass.webp" alt="Fabric Launcher" width={16} height={16} />
                {t("fabricLauncherVersion")}
              </Label>
              <Input id="fabricLauncherVersion" value={config.fabricLauncherVersion || ""} onChange={(e) => updateConfig("fabricLauncherVersion", e.target.value)} placeholder="0.10.2" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">{t("fabricLauncherDesc")}</p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} className="mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                {t("cfApiKeyFromSettings")}{" "}
                <Link href="/dashboard/settings/integrations" className="text-emerald-400 hover:text-emerald-300 underline">
                  {t("settings")}
                </Link>
              </p>
            </div>

            <ModsListEditor
              id="cfFiles"
              provider="curseforge"
              accent="emerald"
              icon="/images/ender_chest.webp"
              label={t("curseforgeFiles")}
              description={t("curseforgeFilesDesc")}
              helpText={t("curseforgeFilesHelp")}
              placeholder="jei, geckolib, aquaculture"
              browseUrl="https://www.curseforge.com/minecraft/search?page=1&pageSize=20&sortBy=relevancy&class=mc-mods"
              value={config.cfFiles || ""}
              minecraftVersion={effectiveMinecraftVersion}
              loader={resolvedLoader}
              onChange={(value) => updateConfig("cfFiles", value)}
              onSearch={() => openModsBrowser("curseforge", "cfFiles")}
            />
          </>
        )}

        {isManualCurseForge && (
          <>
            <div className="bg-amber-900/30 border border-amber-700/30 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
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
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
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
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
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

            <div className="flex items-start gap-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} className="mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                {t("cfApiKeyFromSettings")}{" "}
                <Link href="/dashboard/settings/integrations" className="text-emerald-400 hover:text-emerald-300 underline">
                  {t("settings")}
                </Link>
              </p>
            </div>
          </>
        )}

        {isCurseForge && (
          <>
            <div className="bg-amber-900/30 border border-amber-700/30 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300 font-minecraft">{t("importantInfo")}</p>
                  <p className="text-xs text-amber-200/80 mt-1">{t("cfApiKeyRequired")}</p>
                </div>
              </div>
            </div>

            <CurseForgeModpackSection
              serverId={serverId}
              config={config}
              updateConfig={updateConfig}
              onBrowse={() => setShowModpackBrowser(true)}
            />

            <div className="flex items-start gap-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} className="mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                {t("cfApiKeyFromSettings")}{" "}
                <Link href="/dashboard/settings/integrations" className="text-emerald-400 hover:text-emerald-300 underline">
                  {t("settings")}
                </Link>
              </p>
            </div>

            <ModsListEditor
              id="cfFiles"
              provider="curseforge"
              accent="emerald"
              icon="/images/ender_chest.webp"
              label={t("curseforgeFiles")}
              description={t("curseforgeFilesDesc")}
              helpText={t("curseforgeFilesHelp")}
              placeholder="jei, geckolib, aquaculture"
              browseUrl="https://www.curseforge.com/minecraft/search?page=1&pageSize=20&sortBy=relevancy&class=mc-mods"
              value={config.cfFiles || ""}
              minecraftVersion={effectiveMinecraftVersion}
              loader={resolvedLoader}
              onChange={(value) => updateConfig("cfFiles", value)}
              onSearch={() => openModsBrowser("curseforge", "cfFiles")}
            />
          </>
        )}

        {isModrinth && (
          <>
            <div className="p-4 rounded-md bg-emerald-900/20 border border-emerald-600/30">
              <div className="flex items-center justify-between">
                <Label htmlFor="modrinthModpack" className="text-emerald-400 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/modrinth.svg" alt="Modrinth" width={16} height={16} />
                  {t("modrinthModpack")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("modrinthModpackTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="modrinthModpack"
                value={config.modrinthModpack}
                onChange={(e) => updateConfig("modrinthModpack", e.target.value)}
                placeholder="surface-living"
                className="mt-2 bg-gray-800/70 border-gray-700/50 text-gray-200 focus:border-emerald-500/50 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-gray-400 mt-1">{t("modrinthModpackDesc")}</p>

              <div className="mt-4 border-t border-emerald-600/20 pt-4">
                <Label className="text-emerald-400 font-minecraft text-sm">{t("modpackFiles")}</Label>
                <div className="mt-2">
                  <ModpackFilePicker serverId={serverId} value={config.modrinthModpack} onChange={(containerPath) => updateConfig("modrinthModpack", containerPath)} accept=".mrpack" />
                </div>
              </div>
            </div>
            <h3 className="text-sm font-minecraft text-gray-300 mb-4">Additional mods</h3>
            <div className="flex items-start gap-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} className="mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                {t("cfApiKeyFromSettings")}{" "}
                <Link href="/dashboard/settings/integrations" className="text-emerald-400 hover:text-emerald-300 underline">
                  {t("settings")}
                </Link>
              </p>
            </div>

            <ModsListEditor
              id="cfFiles"
              provider="curseforge"
              accent="emerald"
              icon="/images/ender_chest.webp"
              label={t("curseforgeFiles")}
              description={t("curseforgeFilesDesc")}
              helpText={t("curseforgeFilesHelp")}
              placeholder="jei, geckolib, aquaculture"
              browseUrl="https://www.curseforge.com/minecraft/search?page=1&pageSize=20&sortBy=relevancy&class=mc-mods"
              value={config.cfFiles || ""}
              minecraftVersion={effectiveMinecraftVersion}
              loader={resolvedLoader}
              onChange={(value) => updateConfig("cfFiles", value)}
              onSearch={() => openModsBrowser("curseforge", "cfFiles")}
            />
          </>
        )}

        {isGtnh && (
          <>
            <div className="rounded-md border border-amber-600/30 bg-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div className="space-y-1 text-sm text-amber-100/90">
                  <p className="font-minecraft text-amber-300">{t("gtnhRequirementsTitle")}</p>
                  <p>{t("gtnhRequirementsBody")}</p>
                  <p>{t("gtnhJavaNote")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-amber-500/30 bg-gray-800/50 p-4">
              <Label htmlFor="gtnhPackVersion" className="text-amber-300 font-minecraft text-sm">
                {t("gtnhPackVersion")}
              </Label>
              <Input
                id="gtnhPackVersion"
                value={config.gtnhPackVersion || "2.8.1"}
                onChange={(e) => updateConfig("gtnhPackVersion", e.target.value)}
                placeholder="2.8.1"
                className="bg-gray-800/70 border-gray-700/50 text-gray-200 focus:border-amber-500/50 focus:ring-amber-500/30"
              />
              <p className="text-xs text-gray-400">{t("gtnhPackVersionDesc")}</p>
            </div>

            <div className="space-y-4 rounded-md border border-gray-700/50 bg-gray-800/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="gtnhDeleteBackups" className="text-gray-200 font-minecraft text-sm">
                    {t("gtnhDeleteBackups")}
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">{t("gtnhDeleteBackupsDesc")}</p>
                </div>
                <Switch
                  id="gtnhDeleteBackups"
                  checked={config.gtnhDeleteBackups === true}
                  onCheckedChange={(checked) => updateConfig("gtnhDeleteBackups", checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="skipGtnhUpdateCheck" className="text-gray-200 font-minecraft text-sm">
                    {t("skipGtnhUpdateCheck")}
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">{t("skipGtnhUpdateCheckDesc")}</p>
                </div>
                <Switch
                  id="skipGtnhUpdateCheck"
                  checked={config.skipGtnhUpdateCheck === true}
                  onCheckedChange={(checked) => updateConfig("skipGtnhUpdateCheck", checked)}
                />
              </div>
            </div>
          </>
        )}

        {isFtba && (
          <>
            <div className="rounded-md border border-amber-600/30 bg-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div className="space-y-1 text-sm text-amber-100/90">
                  <p className="font-minecraft text-amber-300">{t("ftbaRequirementsTitle")}</p>
                  <p>{t("ftbaRequirementsBody")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-amber-500/30 bg-gray-800/50 p-4">
              <Label htmlFor="ftbModpackId" className="text-amber-300 font-minecraft text-sm">
                {t("ftbModpackId")}
              </Label>
              <Input
                id="ftbModpackId"
                value={config.ftbModpackId || ""}
                onChange={(e) => updateConfig("ftbModpackId", e.target.value)}
                placeholder="119"
                className="bg-gray-800/70 border-gray-700/50 text-gray-200 focus:border-amber-500/50 focus:ring-amber-500/30"
              />
              <p className="text-xs text-gray-400">{t("ftbModpackIdDesc")}</p>
            </div>

            <div className="space-y-2 rounded-md border border-gray-700/50 bg-gray-800/50 p-4">
              <Label htmlFor="ftbModpackVersionId" className="text-gray-200 font-minecraft text-sm">
                {t("ftbModpackVersionId")}
              </Label>
              <Input
                id="ftbModpackVersionId"
                value={config.ftbModpackVersionId || ""}
                onChange={(e) => updateConfig("ftbModpackVersionId", e.target.value)}
                placeholder={t("ftbModpackVersionIdPlaceholder")}
                className="bg-gray-800/70 border-gray-700/50 text-gray-200 focus:border-amber-500/50 focus:ring-amber-500/30"
              />
              <p className="text-xs text-gray-400">{t("ftbModpackVersionIdDesc")}</p>
            </div>
          </>
        )}

        {(isForge || isNeoforge || isFabric || isCurseForge || isModrinth) && (
          <>
            <ModsListEditor
              id="modrinthProjects"
              provider="modrinth"
              accent="blue"
              icon="/images/enchanted-book.webp"
              label={t("modrinthProjects")}
              description={t("modrinthProjectsDesc")}
              helpText={t("modrinthProjectsHelp")}
              placeholder="fabric-api, cloth-config, datapack:terralith"
              browseUrl="https://modrinth.com/mods"
              value={config.modrinthProjects || ""}
              minecraftVersion={effectiveMinecraftVersion}
              loader={resolvedLoader}
              onChange={(value) => updateConfig("modrinthProjects", value)}
              onSearch={() => openModsBrowser("modrinth", "modrinthProjects")}
            />

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="versionFromModrinthProjects" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/compass.webp" alt="Version" width={16} height={16} />
                  {t("versionFromModrinthProjects")}
                </Label>
                <Switch id="versionFromModrinthProjects" checked={config.versionFromModrinthProjects || false} onCheckedChange={(checked) => updateConfig("versionFromModrinthProjects", checked)} />
              </div>
              <p className="text-xs text-gray-400">{t("versionFromModrinthProjectsDesc")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="modrinthDownloadDependencies" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                    <Image src="/images/hopper.webp" alt="Dependencies" width={16} height={16} />
                    {t("modrinthDependencies")}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>{t("modrinthDependenciesHelp")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={config.modrinthDownloadDependencies || "none"} onValueChange={(value: "none" | "required" | "optional") => updateConfig("modrinthDownloadDependencies", value)}>
                  <SelectTrigger className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-blue-500/30">
                    <SelectValue placeholder="none" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <SelectItem value="none">{t("dependenciesNone")}</SelectItem>
                    <SelectItem value="required">{t("dependenciesRequired")}</SelectItem>
                    <SelectItem value="optional">{t("dependenciesOptional")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="modrinthDefaultVersionType" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                    <Image src="/images/compass.webp" alt="Version Type" width={16} height={16} />
                    {t("modrinthVersionType")}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>{t("modrinthVersionTypeHelp")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={config.modrinthDefaultVersionType || "release"} onValueChange={(value: "release" | "beta" | "alpha") => updateConfig("modrinthDefaultVersionType", value)}>
                  <SelectTrigger className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-blue-500/30">
                    <SelectValue placeholder="release" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <SelectItem value="release">{t("versionRelease")}</SelectItem>
                    <SelectItem value="beta">{t("versionBeta")}</SelectItem>
                    <SelectItem value="alpha">{t("versionAlpha")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {isCurseForge && (
          <>
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
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
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
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
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
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                            <p>{t("forceIncludeModsHelp")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea id="cfForceInclude" value={config.cfForceInclude} onChange={(e) => updateConfig("cfForceInclude", e.target.value)} placeholder="699872,Clumps,228404" className="min-h-20 bg-gray-800/70 border-gray-700/50 text-gray-200 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
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
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                            <p>{t("excludeModsHelp")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea id="cfExclude" value={config.cfExclude} onChange={(e) => updateConfig("cfExclude", e.target.value)} placeholder="699872,Clumps,228404" className="min-h-20 text-gray-200 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                    <p className="text-xs text-gray-400">{t("excludeModsDesc")}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </CardContent>

      <ModpackBrowser open={showModpackBrowser} onClose={() => setShowModpackBrowser(false)} onSelect={handleModpackSelect} />
      <ModsBrowserDialog
        open={showModsBrowser}
        onClose={() => setShowModsBrowser(false)}
        provider={modsBrowserProvider}
        minecraftVersion={effectiveMinecraftVersion}
        loader={resolvedLoader}
        isAdded={isModAlreadyAdded}
        onToggle={toggleModFromBrowser}
      />
    </Card>
  );
};
