import { FC } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface JvmOptionsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const JvmOptionsTab: FC<JvmOptionsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();

  return (
    <>
      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="useAikarFlags" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/enchanted-book.webp" alt={t("useAikarFlags")} width={16} height={16} />
              {t("useAikarFlags")}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t("aikarFlagsTooltip")}</p>
                  <p className="mt-1 text-xs text-emerald-500">{t("aikarFlagsRecommended")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch id="useAikarFlags" checked={config.useAikarFlags || false} onCheckedChange={(checked) => updateConfig("useAikarFlags", checked)} />
        </div>
        <p className="text-xs text-gray-400">{t("aikarFlagsDesc")}</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="enableJmx" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/compass.webp" alt={t("enableJmx")} width={16} height={16} />
              {t("enableJmx")}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t("enableJmxTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch id="enableJmx" checked={config.enableJmx || false} onCheckedChange={(checked) => updateConfig("enableJmx", checked)} />
        </div>
        <p className="text-xs text-gray-400">{t("enableJmxDesc")}</p>
      </div>

      {config.enableJmx && (
        <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
          <Label htmlFor="jmxHost" className="text-gray-200 font-minecraft text-sm">
            {t("jmxHost")}
          </Label>
          <Input id="jmxHost" value={config.jmxHost || ""} onChange={(e) => updateConfig("jmxHost", e.target.value)} placeholder="0.0.0.0" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
          <p className="text-xs text-gray-400">{t("jmxHostDesc")}</p>
        </div>
      )}

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="jvmOpts" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/observer.webp" alt={t("jvmOptionsField")} width={16} height={16} />
          {t("jvmOptionsField")}
        </Label>
        <Textarea id="jvmOpts" value={config.jvmOpts || ""} onChange={(e) => updateConfig("jvmOpts", e.target.value)} placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">{t("jvmOptionsDesc")}</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="jvmXxOpts" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/cauldron.webp" alt={t("jvmXxOptions")} width={16} height={16} />
          {t("jvmXxOptions")}
        </Label>
        <Textarea id="jvmXxOpts" value={config.jvmXxOpts || ""} onChange={(e) => updateConfig("jvmXxOpts", e.target.value)} placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">{t("jvmXxOptionsDesc")}</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="jvmDdOpts" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/redstone.webp" alt={t("systemPropertiesDd")} width={16} height={16} />
          {t("systemPropertiesDd")}
        </Label>
        <Textarea id="jvmDdOpts" value={config.jvmDdOpts || ""} onChange={(e) => updateConfig("jvmDdOpts", e.target.value)} placeholder="net.minecraft.server.level.ChunkMap.radius=3,com.mojang.eula.agree=true" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">{t("systemPropertiesDdDesc")}</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="extraArgs" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/command-block.webp" alt={t("additionalArguments")} width={16} height={16} />
          {t("additionalArguments")}
        </Label>
        <Textarea id="extraArgs" value={config.extraArgs || ""} onChange={(e) => updateConfig("extraArgs", e.target.value)} placeholder="--noconsole" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">{t("additionalArgumentsDesc")}</p>
      </div>
    </>
  );
};
