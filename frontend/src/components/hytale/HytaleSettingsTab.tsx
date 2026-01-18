"use client";

import { FC } from "react";
import { HytaleConfig } from "@/lib/types/hytale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface HytaleSettingsTabProps {
  config: HytaleConfig;
  updateConfig: <K extends keyof HytaleConfig>(field: K, value: HytaleConfig[K]) => void;
}

export const HytaleSettingsTab: FC<HytaleSettingsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-gray-700/40 pb-2">
          {t("generalSettings")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="serverName" className="text-gray-300">
              {t("serverName")}
            </Label>
            <Input
              id="serverName"
              value={config.serverName}
              onChange={(e) => updateConfig("serverName", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port" className="text-gray-300">
              {t("port")} (UDP)
            </Label>
            <Input
              id="port"
              value={config.port}
              onChange={(e) => updateConfig("port", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPlayers" className="text-gray-300">
              {t("maxPlayers")}
            </Label>
            <Input
              id="maxPlayers"
              value={config.maxPlayers || ""}
              onChange={(e) => updateConfig("maxPlayers", e.target.value)}
              placeholder="20"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="viewDistance" className="text-gray-300">
              {t("viewDistance")}
            </Label>
            <Input
              id="viewDistance"
              value={config.viewDistance || ""}
              onChange={(e) => updateConfig("viewDistance", e.target.value)}
              placeholder="10"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>

      {/* Memory Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-gray-700/40 pb-2">
          {t("memorySettings")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="javaXms" className="text-gray-300">
              {t("minMemory")} (JAVA_XMS)
            </Label>
            <Input
              id="javaXms"
              value={config.javaXms}
              onChange={(e) => updateConfig("javaXms", e.target.value)}
              placeholder="4G"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="javaXmx" className="text-gray-300">
              {t("maxMemory")} (JAVA_XMX)
            </Label>
            <Input
              id="javaXmx"
              value={config.javaXmx}
              onChange={(e) => updateConfig("javaXmx", e.target.value)}
              placeholder="8G"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
          <div>
            <Label htmlFor="useG1gc" className="text-gray-300">
              {t("useG1gc")}
            </Label>
            <p className="text-sm text-gray-500">{t("useG1gcDescription")}</p>
          </div>
          <Switch
            id="useG1gc"
            checked={config.useG1gc}
            onCheckedChange={(checked) => updateConfig("useG1gc", checked)}
          />
        </div>
      </div>

      {/* Docker Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-gray-700/40 pb-2">
          {t("dockerSettings")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dockerImage" className="text-gray-300">
              {t("dockerImage")}
            </Label>
            <Input
              id="dockerImage"
              value={config.dockerImage}
              onChange={(e) => updateConfig("dockerImage", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restartPolicy" className="text-gray-300">
              {t("restartPolicy")}
            </Label>
            <Select
              value={config.restartPolicy}
              onValueChange={(value) =>
                updateConfig("restartPolicy", value as HytaleConfig["restartPolicy"])
              }
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="always">Always</SelectItem>
                <SelectItem value="on-failure">On Failure</SelectItem>
                <SelectItem value="unless-stopped">Unless Stopped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tz" className="text-gray-300">
              {t("timezone")}
            </Label>
            <Input
              id="tz"
              value={config.tz}
              onChange={(e) => updateConfig("tz", e.target.value)}
              placeholder="UTC"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bindAddr" className="text-gray-300">
              {t("bindAddress")}
            </Label>
            <Input
              id="bindAddr"
              value={config.bindAddr}
              onChange={(e) => updateConfig("bindAddr", e.target.value)}
              placeholder="0.0.0.0"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
          <div>
            <Label htmlFor="autoDownload" className="text-gray-300">
              {t("autoDownload")}
            </Label>
            <p className="text-sm text-gray-500">{t("autoDownloadDescription")}</p>
          </div>
          <Switch
            id="autoDownload"
            checked={config.autoDownload}
            onCheckedChange={(checked) => updateConfig("autoDownload", checked)}
          />
        </div>
      </div>

      {/* Custom Environment Variables */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-gray-700/40 pb-2">
          {t("customEnvVars")}
        </h3>

        <div className="space-y-2">
          <Label htmlFor="envVars" className="text-gray-300">
            {t("envVarsDescription")}
          </Label>
          <Textarea
            id="envVars"
            value={config.envVars || ""}
            onChange={(e) => updateConfig("envVars", e.target.value)}
            placeholder="KEY=value&#10;ANOTHER_KEY=another_value"
            className="bg-gray-800 border-gray-600 text-white font-mono min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};
