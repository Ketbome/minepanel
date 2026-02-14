import { FC, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { HelpCircle, RefreshCw, Sparkles, Coffee, Smartphone } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ServerConfig, ServerEdition, ServerType } from '@/lib/types/types';
import Image from 'next/image';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useMinecraftVersions } from '@/lib/hooks/useMinecraftVersions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ServerTypeTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ServerTypeTab: FC<ServerTypeTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const edition = config.edition ?? 'JAVA';
  const isJava = edition === 'JAVA';
  const isBedrock = edition === 'BEDROCK';
  const isCurseForge =
    config.serverType === 'AUTO_CURSEFORGE' || config.serverType === 'CURSEFORGE';

  const { versions, loading, latestRelease, refresh, getRecommended } = useMinecraftVersions({
    filterType: 'release',
    limit: 100,
  });

  const [showManualInput, setShowManualInput] = useState(false);
  const recommendedVersions = getRecommended();

  const filteredRecommendedVersions = recommendedVersions.filter((v) => v.id !== latestRelease);

  const recommendedIds = new Set(recommendedVersions.map((v) => v.id));
  const otherVersions = versions.filter((v) => v.id !== latestRelease && !recommendedIds.has(v.id));

  const handleEditionChange = (newEdition: ServerEdition) => {
    // Don't allow edition change if server already exists
    if (config.serverExists) return;

    updateConfig('edition', newEdition);
    // Reset server type to VANILLA when switching to Bedrock
    if (newEdition === 'BEDROCK' && config.serverType !== 'VANILLA') {
      updateConfig('serverType', 'VANILLA');
    }
    // Reset port and other settings to appropriate defaults
    if (newEdition === 'BEDROCK') {
      updateConfig('port', '19132');
      updateConfig('enableRcon', false);
      updateConfig('levelType', 'minecraft:default');
      updateConfig('minecraftVersion', 'LATEST');
    } else {
      updateConfig('port', '25565');
      updateConfig('enableRcon', true);
    }
  };

  console.log("Server type:", config.serverType);


  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image
            src="/images/server-icon.png"
            alt="Server Type"
            width={24}
            height={24}
            className="opacity-90"
          />
          {t('serverType')}
        </CardTitle>
        <CardDescription className="text-gray-300">{t('serverTypeDescription')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Edition Selector */}
        <div className={`space-y-3 p-4 rounded-md border-2 ${config.serverExists ? 'bg-gray-800/30 border-gray-600/30' : 'bg-blue-900/10 border-blue-500/30'}`}>
          <div className="flex items-center justify-between">
            <Label className={`font-minecraft text-sm flex items-center gap-2 ${config.serverExists ? 'text-gray-400' : 'text-blue-400'}`}>
              <Image src="/images/grass.webp" alt="Edition" width={16} height={16} />
              {t('serverEdition')}
            </Label>
            {config.serverExists && (
              <span className="text-xs text-gray-500 italic">{t('editionLocked')}</span>
            )}
          </div>
          <RadioGroup
            value={edition}
            onValueChange={(value) => handleEditionChange(value as ServerEdition)}
            className="grid grid-cols-2 gap-4"
            disabled={config.serverExists}
          >
            <div
              className={`flex items-center space-x-3 rounded-md p-3 transition-all ${config.serverExists ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${edition === 'JAVA' ? 'bg-emerald-600/20 border border-emerald-600/50' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
            >
              <RadioGroupItem value="JAVA" id="java-edition" className="border-emerald-600/50" disabled={config.serverExists} />
              <Label htmlFor="java-edition" className={`flex items-center gap-2 ${config.serverExists ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <Coffee className="h-5 w-5 text-orange-400" />
                <div>
                  <span className="text-gray-100 font-minecraft">Java Edition</span>
                  <p className="text-xs text-gray-400">{t('javaEditionDesc')}</p>
                </div>
              </Label>
            </div>
            <div
              className={`flex items-center space-x-3 rounded-md p-3 transition-all ${config.serverExists ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${edition === 'BEDROCK' ? 'bg-emerald-600/20 border border-emerald-600/50' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
            >
              <RadioGroupItem
                value="BEDROCK"
                id="bedrock-edition"
                className="border-emerald-600/50"
                disabled={config.serverExists}
              />
              <Label htmlFor="bedrock-edition" className={`flex items-center gap-2 ${config.serverExists ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <Smartphone className="h-5 w-5 text-green-400" />
                <div>
                  <span className="text-gray-100 font-minecraft">Bedrock Edition</span>
                  <p className="text-xs text-gray-400">{t('bedrockEditionDesc')}</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Java Version Selector */}
        {!isCurseForge && isJava && (
          <div className="space-y-3 p-4 rounded-md bg-emerald-900/10 border-2 border-emerald-500/30">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="minecraftVersion"
                className="text-emerald-400 font-minecraft text-sm flex items-center gap-2"
              >
                <Image src="/images/diamond.webp" alt="Versión" width={16} height={16} />
                {t('minecraftVersion')}
              </Label>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 bg-transparent hover:bg-emerald-700/30"
                        onClick={() => refresh()}
                        disabled={loading}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t('updateVersions')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs bg-transparent hover:bg-emerald-700/30 text-emerald-400"
                  onClick={() => setShowManualInput(!showManualInput)}
                >
                  {showManualInput ? '← ' + t('list') : t('manual')}
                </Button>
              </div>
            </div>

            {showManualInput ? (
              <Input
                id="minecraftVersion"
                value={config.minecraftVersion}
                onChange={(e) => updateConfig('minecraftVersion', e.target.value)}
                placeholder="1.20.4"
                className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 text-white"
              />
            ) : (
              <Select
                value={config.minecraftVersion}
                onValueChange={(value) => updateConfig('minecraftVersion', value)}
                disabled={loading}
              >
                <SelectTrigger className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 text-white">
                  <SelectValue placeholder={loading ? t('loadingVersions') : t('selectVersion')} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-[300px]">
                  {latestRelease && (
                    <>
                      <SelectItem
                        value={latestRelease}
                        className="text-white hover:bg-gray-700 focus:bg-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                          <span>{latestRelease}</span>
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-xs border-yellow-500/30">
                            {t('latest')}
                          </Badge>
                        </div>
                      </SelectItem>
                      <div className="h-px bg-gray-700 my-1" />
                    </>
                  )}

                  {filteredRecommendedVersions.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                        {t('recommended')}
                      </div>
                      {filteredRecommendedVersions.map((version) => (
                        <SelectItem
                          key={`recommended-${version.id}`}
                          value={version.id}
                          className="text-white hover:bg-gray-700 focus:bg-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            <span>{version.id}</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs border-emerald-500/30">
                              {t('popular')}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <div className="h-px bg-gray-700 my-1" />
                    </>
                  )}

                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                    {t('allVersions')}
                  </div>
                  {otherVersions.map((version) => (
                    <SelectItem
                      key={version.id}
                      value={version.id}
                      className="text-white hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {version.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-400">{t('minecraftVersionDesc')}</p>
            {!loading && versions.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400/70">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {versions.length} {t('versionsAvailable')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bedrock Version Selector */}
        {isBedrock && (
          <div className="space-y-3 p-4 rounded-md bg-green-900/10 border-2 border-green-500/30">
            <Label
              htmlFor="bedrockVersion"
              className="text-green-400 font-minecraft text-sm flex items-center gap-2"
            >
              <Image src="/images/diamond.webp" alt="Version" width={16} height={16} />
              {t('bedrockVersion')}
            </Label>
            <Select
              value={config.minecraftVersion || 'LATEST'}
              onValueChange={(value) => updateConfig('minecraftVersion', value)}
            >
              <SelectTrigger className="bg-gray-800/70 border-gray-700/50 focus:border-green-500/50 focus:ring-green-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem
                  value="LATEST"
                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                    <span>LATEST</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 text-xs border-yellow-500/30">
                      {t('autoUpdate')}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem
                  value="PREVIEW"
                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span>PREVIEW</span>
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs border-purple-500/30">
                      {t('preview')}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem
                  value="PREVIOUS"
                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                >
                  PREVIOUS
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">{t('bedrockVersionDesc')}</p>
          </div>
        )}

        {/* Docker Image Tag - Only for Java Edition */}
        {isJava && (
          <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="dockerImage"
                className="text-gray-200 font-minecraft text-sm flex items-center gap-2"
              >
                <Image src="/images/barrier.webp" alt="Docker" width={16} height={16} />
                {t('dockerImage')}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50"
                    >
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <p>{t('dockerImageDesc')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="dockerImage"
              value={config.dockerImage}
              onChange={(e) => updateConfig('dockerImage', e.target.value)}
              placeholder="java17"
              className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30"
            />
            <div className="space-y-1">
              <p className="text-xs text-gray-400">{t('dockerImageHelp')}</p>
              <div className="flex items-center gap-2 p-2 bg-blue-900/30 border border-blue-700/50 rounded">
                <div className="shrink-0">
                  <svg className="h-4 w-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-xs text-blue-300">
                  <span>{t('dockerImageHelpTags')}: </span>
                  <a
                    href="https://docker-minecraft-server.readthedocs.io/en/latest/versions/java/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {t('dockerImageHelpDocumentation')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Server Type Selector - Only for Java Edition */}
        {isJava && (
          <div className="border-t border-gray-700/50 pt-4">
            <h3 className="text-sm font-minecraft text-gray-300 mb-4">{t('selectType')}</h3>
            <RadioGroup
              value={config.serverType}
              onValueChange={(value: ServerType) => updateConfig('serverType', value)}
              className="space-y-4"
            >
              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'VANILLA' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/grass.webp" alt="Vanilla" width={24} height={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="VANILLA"
                      id="vanilla"
                      className="border-emerald-600/50"
                    />
                    <Label
                      htmlFor="vanilla"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      Vanilla
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverVanilla')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'FORGE' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/anvil.webp" alt="Forge" width={24} height={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FORGE" id="forge" className="border-emerald-600/50" />
                    <Label
                      htmlFor="forge"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      Forge
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverForge')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'NEOFORGE' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/fox.webp" alt="Neoforge" width={24} height={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NEOFORGE" id="neoforge" className="border-emerald-600/50" />
                    <Label
                      htmlFor="neoforge"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      Neoforge
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverNeoforge')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'FABRIC' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/crafting-table.webp" alt="Fabric" width={24} height={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FABRIC" id="fabric" className="border-emerald-600/50" />
                    <Label
                      htmlFor="fabric"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      Fabric
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverFabric')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'AUTO_CURSEFORGE' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image
                    src="/images/enchanted-book.webp"
                    alt="CurseForge"
                    width={24}
                    height={24}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="AUTO_CURSEFORGE"
                      id="curseforge"
                      className="border-emerald-600/50"
                    />
                    <Label
                      htmlFor="curseforge"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      CurseForge Modpack
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverCurseForge')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'CURSEFORGE' ? 'bg-amber-600/10 border border-amber-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/book.webp" alt="CurseForge Manual" width={24} height={24} />
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1 rounded text-[8px] font-bold">
                    LEGACY
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="CURSEFORGE"
                      id="curseforge-manual"
                      className="border-amber-600/50"
                    />
                    <Label
                      htmlFor="curseforge-manual"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      CurseForge Manual (Deprecated)
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverCurseForgeManual')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'SPIGOT' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/redstone.webp" alt="Spigot" width={24} height={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SPIGOT" id="spigot" className="border-emerald-600/50" />
                    <Label
                      htmlFor="spigot"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      Spigot
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverSpigot')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'PAPER' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/paper.webp" alt="Paper" width={24} height={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PAPER" id="paper" className="border-emerald-600/50" />
                    <Label
                      htmlFor="paper"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      Paper
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverPaper')}</p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-4 rounded-md p-4 transition-transform duration-200 hover:scale-[1.01] ${config.serverType === 'BUKKIT' ? 'bg-emerald-600/10 border border-emerald-600/30' : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60'}`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 shrink-0">
                  <Image src="/images/emerald.webp" alt="Bukkit" width={24} height={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BUKKIT" id="bukkit" className="border-emerald-600/50" />
                    <Label
                      htmlFor="bukkit"
                      className="text-base font-medium text-gray-100 font-minecraft"
                    >
                      Bukkit
                    </Label>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{t('serverBukkit')}</p>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Bedrock Info */}
        {isBedrock && (
          <div className="p-4 rounded-md bg-green-900/10 border border-green-500/30">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-green-400 mt-0.5" />
              <div>
                <h4 className="text-green-400 font-minecraft text-sm">{t('bedrockInfo')}</h4>
                <p className="text-xs text-gray-400 mt-1">{t('bedrockInfoDesc')}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
