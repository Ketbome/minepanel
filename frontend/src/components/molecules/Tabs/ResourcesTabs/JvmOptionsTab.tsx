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

interface JvmOptionsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const JvmOptionsTab: FC<JvmOptionsTabProps> = ({ config, updateConfig }) => {
  return (
    <>
      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="useAikarFlags" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/enchanted-book.webp" alt="Flags de Aikar" width={16} height={16} />
              Usar Flags de Aikar
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                  <p>Aikar ha realizado investigaciones para encontrar las banderas JVM óptimas para el ajuste de GC, lo que es más importante cuantos más usuarios se conectan simultáneamente.</p>
                  <p className="mt-1 text-xs text-emerald-500">Recomendado para servidores con muchos jugadores</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch id="useAikarFlags" checked={config.useAikarFlags || false} onCheckedChange={(checked) => updateConfig("useAikarFlags", checked)} />
        </div>
        <p className="text-xs text-gray-400">Utiliza configuraciones optimizadas de JVM para servidores con muchos jugadores</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="enableJmx" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/compass.webp" alt="JMX" width={16} height={16} />
              Habilitar JMX
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>Permite el monitoreo remoto JMX, como para perfilar con VisualVM o JMC</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch id="enableJmx" checked={config.enableJmx || false} onCheckedChange={(checked) => updateConfig("enableJmx", checked)} />
        </div>
        <p className="text-xs text-gray-400">Habilita el monitoreo remoto de JMX para herramientas de diagnóstico</p>
      </div>

      {config.enableJmx && (
        <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
          <Label htmlFor="jmxHost" className="text-gray-200 font-minecraft text-sm">
            Host JMX
          </Label>
          <Input id="jmxHost" value={config.jmxHost || ""} onChange={(e) => updateConfig("jmxHost", e.target.value)} placeholder="0.0.0.0" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
          <p className="text-xs text-gray-400">IP/Host que ejecuta el contenedor Docker (necesario para JMX remoto)</p>
        </div>
      )}

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="jvmOpts" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/observer.webp" alt="JVM Opts" width={16} height={16} />
          Opciones de JVM
        </Label>
        <Textarea id="jvmOpts" value={config.jvmOpts || ""} onChange={(e) => updateConfig("jvmOpts", e.target.value)} placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">Opciones generales de JVM separadas por espacios (argumentos comenzando con -X)</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="jvmXxOpts" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/cauldron.webp" alt="JVM XX Opts" width={16} height={16} />
          Opciones XX de JVM
        </Label>
        <Textarea id="jvmXxOpts" value={config.jvmXxOpts || ""} onChange={(e) => updateConfig("jvmXxOpts", e.target.value)} placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">Opciones específicas XX de JVM (deben preceder a las opciones -X)</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="jvmDdOpts" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/redstone.webp" alt="JVM DD Opts" width={16} height={16} />
          Propiedades del Sistema (DD)
        </Label>
        <Textarea id="jvmDdOpts" value={config.jvmDdOpts || ""} onChange={(e) => updateConfig("jvmDdOpts", e.target.value)} placeholder="net.minecraft.server.level.ChunkMap.radius=3,com.mojang.eula.agree=true" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">Lista de propiedades del sistema separadas por comas (name=value o name:value)</p>
      </div>

      <div className="p-4 rounded-md bg-gray-800/50 border border-gray-700/50 space-y-2">
        <Label htmlFor="extraArgs" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
          <Image src="/images/command-block.webp" alt="Args Adicionales" width={16} height={16} />
          Argumentos Adicionales
        </Label>
        <Textarea id="extraArgs" value={config.extraArgs || ""} onChange={(e) => updateConfig("extraArgs", e.target.value)} placeholder="--noconsole" className="min-h-20 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
        <p className="text-xs text-gray-400">Argumentos adicionales que se pasarán al archivo JAR del servidor</p>
      </div>
    </>
  );
};
