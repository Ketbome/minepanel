import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HelpCircle, Smartphone, Shield, Cpu, Users } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface BedrockSettingsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
  disabled?: boolean;
}

export const BedrockSettingsTab: FC<BedrockSettingsTabProps> = ({ config, updateConfig, disabled = false }) => {
  const { t } = useLanguage();

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-green-400 font-minecraft flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          {t("bedrockSettings")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("bedrockSettingsDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Permissions Section */}
        <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-minecraft text-green-400">{t("permissions")}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="allowCheats" className="text-gray-200 text-sm flex items-center gap-2">
                  {t("allowCheats")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("allowCheatsDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch id="allowCheats" checked={config.allowCheats ?? false} onCheckedChange={(checked) => updateConfig("allowCheats", checked)} disabled={disabled} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="defaultPlayerPermissionLevel" className="text-gray-200 text-sm">
                  {t("defaultPermissionLevel")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("defaultPermissionLevelDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={config.defaultPlayerPermissionLevel ?? "member"} onValueChange={(value: "visitor" | "member" | "operator") => updateConfig("defaultPlayerPermissionLevel", value)} disabled={disabled}>
                <SelectTrigger className="bg-gray-800/70 border-gray-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="visitor" className="text-white hover:bg-gray-700">{t("visitor")}</SelectItem>
                  <SelectItem value="member" className="text-white hover:bg-gray-700">{t("member")}</SelectItem>
                  <SelectItem value="operator" className="text-white hover:bg-gray-700">{t("operator")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Performance Section */}
        <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-minecraft text-green-400">{t("performance")}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tickDistance" className="text-gray-200 text-sm">
                  {t("tickDistance")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("tickDistanceDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="tickDistance" type="number" min="4" max="12" value={config.tickDistance ?? "4"} onChange={(e) => updateConfig("tickDistance", e.target.value)} className="bg-gray-800/70 border-gray-700/50 text-white" disabled={disabled} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxThreads" className="text-gray-200 text-sm">
                  {t("maxThreads")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("maxThreadsDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="maxThreads" type="number" min="1" max="32" value={config.maxThreads ?? "8"} onChange={(e) => updateConfig("maxThreads", e.target.value)} className="bg-gray-800/70 border-gray-700/50 text-white" disabled={disabled} />
            </div>
          </div>
        </div>

        {/* Player Settings Section */}
        <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-minecraft text-green-400">{t("playerSettings")}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="texturepackRequired" className="text-gray-200 text-sm">
                  {t("texturepackRequired")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("texturepackRequiredDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch id="texturepackRequired" checked={config.texturepackRequired ?? false} onCheckedChange={(checked) => updateConfig("texturepackRequired", checked)} disabled={disabled} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="whiteList" className="text-gray-200 text-sm">
                  {t("whiteList")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>{t("whiteListDesc")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch id="whiteList" checked={config.whiteList ?? false} onCheckedChange={(checked) => updateConfig("whiteList", checked)} disabled={disabled} />
            </div>
          </div>
        </div>

        {/* IPv6 Section */}
        <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="serverPortV6" className="text-gray-200 text-sm">
                {t("serverPortV6")}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <p>{t("serverPortV6Desc")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input id="serverPortV6" type="number" value={config.serverPortV6 ?? ""} onChange={(e) => updateConfig("serverPortV6", e.target.value)} placeholder="19133" className="bg-gray-800/70 border-gray-700/50 text-white" disabled={disabled} />
            <p className="text-xs text-gray-400">{t("serverPortV6Help")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
