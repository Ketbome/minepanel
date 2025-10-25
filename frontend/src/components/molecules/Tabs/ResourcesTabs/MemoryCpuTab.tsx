import { FC } from "react";
import { ServerConfig } from "@/lib/types/types";
import { FormField } from "@/components/ui/form-field";

interface MemoryCpuTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const MemoryCpuTab: FC<MemoryCpuTabProps> = ({ config, updateConfig }) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="initMemory" label="Memoria Inicial (JVM)" value={config.initMemory || "1G"} onChange={(value) => updateConfig("initMemory", value)} placeholder="1G" tooltip="Memoria inicial asignada a la JVM (-Xms)" description="Memoria inicial asignada a Java (Xms) - ej: 2G, 1024M" icon="/images/clock.webp" iconAlt="Memoria Inicial" />

        <FormField id="maxMemory" label="Memoria Máxima (JVM)" value={config.maxMemory || "1G"} onChange={(value) => updateConfig("maxMemory", value)} placeholder="1G" tooltip="Memoria máxima asignada a la JVM (-Xmx)" description="Memoria máxima asignada a Java (Xmx) - ej: 4G, 4096M" icon="/images/clock.webp" iconAlt="Memoria Máxima" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="cpuLimit" label="Límite de CPU" value={config.cpuLimit} onChange={(value) => updateConfig("cpuLimit", value)} placeholder="2" tooltip="Límite máximo de CPU para el contenedor Docker" description="Número máximo de núcleos de CPU que puede usar el servidor" icon="/images/redstone.webp" iconAlt="CPU Límite" />

        <FormField id="cpuReservation" label="Reserva de CPU" value={config.cpuReservation} onChange={(value) => updateConfig("cpuReservation", value)} placeholder="0.5" tooltip="Cantidad mínima de CPU garantizada para el contenedor" description="Cantidad mínima de CPU garantizada para el contenedor" icon="/images/repeater.webp" iconAlt="CPU Reserva" />
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="memoryReservation" label="Reserva de Memoria (Docker)" value={config.memoryReservation} onChange={(value) => updateConfig("memoryReservation", value)} placeholder="2G" tooltip="Cantidad de memoria reservada para el contenedor Docker" description="Cantidad de memoria reservada para el contenedor Docker" icon="/images/iron-bars.webp" iconAlt="Reserva de Memoria" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <FormField id="uid" label="Usuario Linux (UID)" type="number" value={config.uid || "1000"} onChange={(value) => updateConfig("uid", value)} placeholder="1000" description="ID de usuario Linux bajo el cual se ejecutará el servidor" icon="/images/player-head.png" iconAlt="Usuario" />

        <FormField id="gid" label="Grupo Linux (GID)" type="number" value={config.gid || "1000"} onChange={(value) => updateConfig("gid", value)} placeholder="1000" description="ID de grupo Linux bajo el cual se ejecutará el servidor" icon="/images/player-head.png" iconAlt="Grupo" />
      </div>
    </>
  );
};
