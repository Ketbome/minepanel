import { FC } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ServerConfig } from "@/lib/types/types";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";

interface BasicSettingsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const BasicSettingsTab: FC<BasicSettingsTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();

  return (
    <>
      <FormField id="serverName" label={t("serverName")} value={config.serverName} onChange={(value) => updateConfig("serverName", value)} placeholder={t("serverNamePlaceholder")} />

      <FormField id="motd" label={t("motd")} value={config.motd} onChange={(value) => updateConfig("motd", value)} placeholder={t("motdPlaceholder")} description={t("motdDescription")} />

      <FormField id="maxPlayers" label={t("maxPlayers")} type="number" value={config.maxPlayers || ""} onChange={(value) => updateConfig("maxPlayers", value)} placeholder={t("maxPlayersPlaceholder")} icon="/images/player-head.png" iconAlt={t("players")} />

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="pvp" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
            <Image src="/images/sword.png" alt={t("pvp")} width={16} height={16} />
            {t("pvp")}
          </Label>
          <Switch id="pvp" checked={config.pvp} onCheckedChange={(checked) => updateConfig("pvp", checked)} />
        </div>
        <p className="text-xs text-gray-400">{t("pvpDescription")}</p>
      </div>
    </>
  );
};
