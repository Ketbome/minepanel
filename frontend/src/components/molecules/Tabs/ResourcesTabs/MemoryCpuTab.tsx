import { FC } from "react";
import { ServerConfig } from "@/lib/types/types";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface MemoryCpuTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const MemoryCpuTab: FC<MemoryCpuTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="initMemory" label={t("initialMemoryJvm")} value={config.initMemory || "1G"} onChange={(value) => updateConfig("initMemory", value)} placeholder="1G" tooltip={t("initialMemoryTooltip")} description={t("initialMemoryDesc")} icon="/images/clock.webp" iconAlt={t("initialMemoryJvm")} />

        <FormField id="maxMemory" label={t("maxMemoryJvm")} value={config.maxMemory || "1G"} onChange={(value) => updateConfig("maxMemory", value)} placeholder="1G" tooltip={t("maxMemoryTooltip")} description={t("maxMemoryDesc")} icon="/images/clock.webp" iconAlt={t("maxMemoryJvm")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="cpuLimit" label={t("cpuLimit")} value={config.cpuLimit} onChange={(value) => updateConfig("cpuLimit", value)} placeholder="2" tooltip={t("cpuLimitTooltip")} description={t("cpuLimitDesc")} icon="/images/redstone.webp" iconAlt={t("cpuLimit")} />

        <FormField id="cpuReservation" label={t("cpuReservation")} value={config.cpuReservation} onChange={(value) => updateConfig("cpuReservation", value)} placeholder="0.5" tooltip={t("cpuReservationTooltip")} description={t("cpuReservationDesc")} icon="/images/repeater.webp" iconAlt={t("cpuReservation")} />
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="memoryReservation" label={t("memoryReservationDocker")} value={config.memoryReservation} onChange={(value) => updateConfig("memoryReservation", value)} placeholder="2G" tooltip={t("memoryReservationTooltip")} description={t("memoryReservationDesc")} icon="/images/iron-bars.webp" iconAlt={t("memoryReservationDocker")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="uid" label={t("linuxUserUid")} type="number" value={config.uid || "1000"} onChange={(value) => updateConfig("uid", value)} placeholder="1000" description={t("linuxUserDesc")} icon="/images/player-head.png" iconAlt={t("linuxUserUid")} />

        <FormField id="gid" label={t("linuxGroupGid")} type="number" value={config.gid || "1000"} onChange={(value) => updateConfig("gid", value)} placeholder="1000" description={t("linuxGroupDesc")} icon="/images/player-head.png" iconAlt={t("linuxGroupGid")} />
      </div>
    </>
  );
};
