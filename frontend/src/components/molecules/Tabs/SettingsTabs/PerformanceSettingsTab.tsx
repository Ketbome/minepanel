import { FC } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ServerConfig } from "@/lib/types/types";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface PerformanceSettingsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const PerformanceSettingsTab: FC<PerformanceSettingsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const isJava = config.edition !== "BEDROCK";

  return (
    <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
      <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
        <Image src="/images/redstone.webp" alt={t("performanceConfig")} width={20} height={20} />
        {t("performanceConfig")}
      </h3>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="view-distance" className="text-gray-200 font-minecraft text-sm">
              {t("viewDistance")}
            </Label>
            <span className="bg-gray-800/90 px-2 py-1 rounded text-xs font-mono">
              {config.viewDistance || "10"} {t("chunks")}
            </span>
          </div>
          <Slider id="view-distance" min={2} max={32} step={1} value={[Number(config.viewDistance || 10)]} onValueChange={(value: number[]) => updateConfig("viewDistance", String(value[0]))} className="my-4" />
          <p className="text-xs text-gray-400">{t("viewDistanceDesc")}</p>
        </div>

        {isJava && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="simulation-distance" className="text-gray-200 font-minecraft text-sm">
                  {t("simulationDistance")}
                </Label>
                <span className="bg-gray-800/90 px-2 py-1 rounded text-xs font-mono">
                  {config.simulationDistance || 10} {t("chunks")}
                </span>
              </div>
              <Slider id="simulation-distance" min={2} max={32} step={1} value={[Number(config.simulationDistance || 10)]} onValueChange={(value: number[]) => updateConfig("simulationDistance", String(value[0]))} className="my-4" />
              <p className="text-xs text-gray-400">{t("simulationDistanceDesc")}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="commandBlock" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/command-block.webp" alt={t("enableCommandBlocks")} width={16} height={16} />
                  {t("enableCommandBlocks")}
                </Label>
                <Switch id="commandBlock" checked={config.commandBlock} onCheckedChange={(checked) => updateConfig("commandBlock", checked)} />
              </div>
              <p className="text-xs text-gray-400">{t("enableCommandBlocksDesc")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
