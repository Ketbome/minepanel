import { FC } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ServerConfig } from "@/lib/types/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";

interface WorldSettingsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const WorldSettingsTab: FC<WorldSettingsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();

  return (
    <>
      <FormField id="seed" label={t("seed")} value={config.seed || ""} onChange={(value) => updateConfig("seed", value)} placeholder={t("seedPlaceholder")} description={t("seedDescription")} icon="/images/grass.webp" iconAlt={t("seed")} />

      <div className="space-y-2 text-gray-200">
        <Label htmlFor="levelType" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/map.webp" alt={t("levelType")} width={16} height={16} />
          {t("levelType")}
        </Label>
        <Select value={config.levelType || "minecraft:default"} onValueChange={(value: ServerConfig["levelType"]) => updateConfig("levelType", value)}>
          <SelectTrigger id="levelType" className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30">
            <SelectValue placeholder={t("selectLevelType")} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="minecraft:default">{t("normal")}</SelectItem>
            <SelectItem value="minecraft:flat">{t("flat")}</SelectItem>
            <SelectItem value="minecraft:large_biomes">{t("largeBiomes")}</SelectItem>
            <SelectItem value="minecraft:amplified">{t("amplified")}</SelectItem>
            <SelectItem value="minecraft:single_biome_surface">{t("singleBiomeSurface")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 text-gray-200">
        <Label htmlFor="difficulty" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/sword.png" alt={t("difficulty")} width={16} height={16} />
          {t("difficulty")}
        </Label>
        <Select value={config.difficulty} onValueChange={(value: ServerConfig["difficulty"]) => updateConfig("difficulty", value)}>
          <SelectTrigger id="difficulty" className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30">
            <SelectValue placeholder={t("selectDifficulty")} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="peaceful">
              <div className="flex items-center gap-2">
                <Image src="/images/peaceful.png" alt={t("peaceful")} width={16} height={16} />
                <span>{t("peaceful")}</span>
              </div>
            </SelectItem>
            <SelectItem value="easy">
              <div className="flex items-center gap-2">
                <Image src="/images/easy.png" alt={t("easy")} width={16} height={16} />
                <span>{t("easy")}</span>
              </div>
            </SelectItem>
            <SelectItem value="normal">
              <div className="flex items-center gap-2">
                <Image src="/images/easy.png" alt={t("normal")} width={16} height={16} />
                <span>{t("normal")}</span>
              </div>
            </SelectItem>
            <SelectItem value="hard">
              <div className="flex items-center gap-2">
                <Image src="/images/hard.png" alt={t("hard")} width={16} height={16} />
                <span>{t("hard")}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 text-gray-200">
        <Label htmlFor="gameMode" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/diamond-pickaxe.webp" alt={t("gameMode")} width={16} height={16} />
          {t("gameMode")}
        </Label>
        <Select value={config.gameMode || "survival"} onValueChange={(value: ServerConfig["gameMode"]) => updateConfig("gameMode", value)}>
          <SelectTrigger id="gameMode" className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30">
            <SelectValue placeholder={t("selectGameMode")} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="survival">
              <div className="flex items-center gap-2">
                <Image src="/images/sword.png" alt={t("survival")} width={16} height={16} />
                <span>{t("survival")}</span>
              </div>
            </SelectItem>
            <SelectItem value="creative">
              <div className="flex items-center gap-2">
                <Image src="/images/grass-block.webp" alt={t("creative")} width={16} height={16} />
                <span>{t("creative")}</span>
              </div>
            </SelectItem>
            <SelectItem value="adventure">
              <div className="flex items-center gap-2">
                <Image src="/images/compass.webp" alt={t("adventure")} width={16} height={16} />
                <span>{t("adventure")}</span>
              </div>
            </SelectItem>
            <SelectItem value="spectator">
              <div className="flex items-center gap-2">
                <Image src="/images/ender-pearl.webp" alt={t("spectator")} width={16} height={16} />
                <span>{t("spectator")}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="hardcore" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
            <Image src="/images/hard.png" alt={t("hardcore")} width={16} height={16} />
            {t("hardcore")}
          </Label>
          <Switch id="hardcore" checked={config.hardcore} onCheckedChange={(checked) => updateConfig("hardcore", checked)} className="data-[state=checked]:bg-red-500" />
        </div>
        <p className="text-xs text-gray-400">{t("hardcoreDescription")}</p>
      </div>

      <Accordion type="single" collapsible className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md">
        <AccordionItem value="spawning" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 text-gray-200 font-minecraft text-sm hover:bg-gray-700/30 rounded-t-md flex items-center gap-2">
            <Image src="/images/spawner.webp" alt={t("spawningOptions")} width={16} height={16} />
            <span>{t("spawningOptions")}</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4 px-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="spawnAnimals" className="text-gray-200 flex items-center gap-2">
                  <Image src="/images/cow.jpg" alt={t("spawnAnimals")} width={16} height={16} />
                  {t("spawnAnimals")}
                </Label>
                <Switch id="spawnAnimals" checked={config.spawnAnimals !== false} onCheckedChange={(checked) => updateConfig("spawnAnimals", checked)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="spawnMonsters" className="text-gray-200 flex items-center gap-2">
                  <Image src="/images/creeper.webp" alt={t("spawnMonsters")} width={16} height={16} />
                  {t("spawnMonsters")}
                </Label>
                <Switch id="spawnMonsters" checked={config.spawnMonsters !== false} onCheckedChange={(checked) => updateConfig("spawnMonsters", checked)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="spawnNpcs" className="text-gray-200 flex items-center gap-2">
                  <Image src="/images/villager.png" alt={t("spawnNpcs")} width={16} height={16} />
                  {t("spawnNpcs")}
                </Label>
                <Switch id="spawnNpcs" checked={config.spawnNpcs !== false} onCheckedChange={(checked) => updateConfig("spawnNpcs", checked)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="generateStructures" className="text-gray-200 flex items-center gap-2">
                  <Image src="/images/structure.webp" alt={t("generateStructures")} width={16} height={16} />
                  {t("generateStructures")}
                </Label>
                <Switch id="generateStructures" checked={config.generateStructures !== false} onCheckedChange={(checked) => updateConfig("generateStructures", checked)} />
              </div>
              <p className="text-xs text-gray-400">{t("generateStructuresDescription")}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="allowNether" className="text-gray-200 flex items-center gap-2">
                  <Image src="/images/nether.webp" alt={t("allowNether")} width={16} height={16} />
                  {t("allowNether")}
                </Label>
                <Switch id="allowNether" checked={config.allowNether !== false} onCheckedChange={(checked) => updateConfig("allowNether", checked)} />
              </div>
              <p className="text-xs text-gray-400">{t("allowNetherDescription")}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
};
