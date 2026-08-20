import { FC } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
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

        {!isJava && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tickDistance" className="text-gray-200 font-minecraft text-sm">
                  {t("tickDistance")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("tickDistanceDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="tickDistance" type="number" min="4" max="12" value={config.tickDistance ?? "4"} onChange={(e) => updateConfig("tickDistance", e.target.value)} className="bg-gray-800/70 border-gray-700/50 text-white" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxThreads" className="text-gray-200 font-minecraft text-sm">
                  {t("maxThreads")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("maxThreadsDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="maxThreads" type="number" min="1" max="32" value={config.maxThreads ?? "8"} onChange={(e) => updateConfig("maxThreads", e.target.value)} className="bg-gray-800/70 border-gray-700/50 text-white" />
            </div>
          </div>
        )}

        {isJava && (
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
        )}
      </div>
    </div>
  );
};
