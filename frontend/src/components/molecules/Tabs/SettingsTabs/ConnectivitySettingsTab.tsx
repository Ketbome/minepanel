import { FC } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ServerConfig } from "@/lib/types/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConnectivitySettingsTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ConnectivitySettingsTab: FC<ConnectivitySettingsTabProps> = ({ config, updateConfig }) => {
  return (
    <>
      <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
        <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/ender-pearl.webp" alt="Conectividad" width={20} height={20} />
          Configuración de Conexión
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverPort" className="text-gray-200 font-minecraft text-sm">
              Puerto del Servidor
            </Label>
            <Input id="serverPort" type="number" value={config.port || 25565} onChange={(e) => updateConfig("port", String(e.target.value))} placeholder="25565" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
            <p className="text-xs text-gray-400">Puerto en el que escuchará el servidor. El puerto por defecto es 25565.</p>
            <Alert className="bg-amber-900/30 border-amber-800 text-amber-200 mt-2 py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>⚠️ Este puerto debe ser distinto al de otros servidores en ejecución para evitar conflictos.</AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerIdleTimeout" className="text-gray-200 font-minecraft text-sm">
              Tiempo de Inactividad de Jugadores (minutos)
            </Label>
            <Input id="playerIdleTimeout" type="number" value={config.playerIdleTimeout || 0} onChange={(e) => updateConfig("playerIdleTimeout", String(e.target.value))} placeholder="0" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
            <p className="text-xs text-gray-400">Tiempo en minutos antes de expulsar a jugadores inactivos (0 para desactivar)</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="onlineMode" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                <Image src="/images/sword.png" alt="Modo Online" width={16} height={16} />
                Modo Online
              </Label>
              <Switch id="onlineMode" checked={config.onlineMode !== false} onCheckedChange={(checked) => updateConfig("onlineMode", checked)} />
            </div>
            <p className="text-xs text-gray-400">Si está activado, el servidor verificará que los jugadores estén autenticados con Mojang. Es recomendable dejarlo activado para prevenir usuarios con nombres falsos.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="preventProxyConnections" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                <Image src="/images/shield.png" alt="Prevenir Proxy" width={16} height={16} />
                Prevenir Conexiones por Proxy
              </Label>
              <Switch id="preventProxyConnections" checked={config.preventProxyConnections === true} onCheckedChange={(checked) => updateConfig("preventProxyConnections", checked)} />
            </div>
            <p className="text-xs text-gray-400">Si está activado, el servidor intentará detectar y bloquear conexiones a través de proxies/VPNs.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50 mt-4">
        <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/command-block.webp" alt="Jugadores" width={20} height={20} />
          Control de Acceso
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ops" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/diamond.webp" alt="Operadores" width={16} height={16} />
              Operadores del Servidor
            </Label>
            <Input id="ops" value={config.ops || ""} onChange={(e) => updateConfig("ops", e.target.value)} placeholder="admin1,admin2" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
            <p className="text-xs text-gray-400">Jugadores con permisos de administrador, separados por comas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opPermissionLevel" className="text-gray-200 font-minecraft text-sm">
              Nivel de Permisos de OPs
            </Label>
            <Select value={config.opPermissionLevel?.toString() || "4"} onValueChange={(value) => updateConfig("opPermissionLevel", String(value))}>
              <SelectTrigger id="opPermissionLevel" className="bg-gray-800/70 border-gray-700/50 focus:ring-emerald-500/30">
                <SelectValue placeholder="Selecciona nivel" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                <SelectItem value="1">Nivel 1 (Mínimo)</SelectItem>
                <SelectItem value="2">Nivel 2</SelectItem>
                <SelectItem value="3">Nivel 3</SelectItem>
                <SelectItem value="4">Nivel 4 (Máximo)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Nivel de permisos para operadores (4 = acceso completo)</p>
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md mt-4">
        <AccordionItem value="rcon" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 text-gray-200 font-minecraft text-sm hover:bg-gray-700/30 rounded-t-md">
            <div className="flex items-center gap-2">
              <Image src="/images/command-block.webp" alt="RCON" width={16} height={16} />
              RCON (Control Remoto)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <p>Configura el acceso remoto a la consola del servidor</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4 px-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableRcon" className="text-gray-200 font-minecraft text-sm">
                  Activar RCON
                </Label>
                <Switch id="enableRcon" checked={config.enableRcon !== false} onCheckedChange={(checked) => updateConfig("enableRcon", checked)} />
              </div>
              <p className="text-xs text-gray-400">Permite el control remoto del servidor a través del protocolo RCON</p>

              {config.enableBackup && !config.enableRcon && (
                <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-200 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Las copias de seguridad requieren RCON activado para funcionar correctamente.</AlertDescription>
                </Alert>
              )}
            </div>

            {config.enableRcon !== false && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rconPort" className="text-gray-200 font-minecraft text-sm">
                    Puerto RCON
                  </Label>
                  <Input id="rconPort" type="number" value={config.rconPort || 25575} onChange={(e) => updateConfig("rconPort", String(e.target.value))} placeholder="25575" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rconPassword" className="text-gray-200 font-minecraft text-sm">
                    Contraseña RCON
                  </Label>
                  <Input id="rconPassword" type="password" value={config.rconPassword || ""} onChange={(e) => updateConfig("rconPassword", e.target.value)} placeholder="Contraseña segura requerida" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                  <p className="text-xs text-red-400 font-medium">¡Importante! Debes cambiar la contraseña por defecto</p>
                </div>

                {config.enableBackup && (
                  <Alert className="bg-amber-900/30 border-amber-800 text-amber-200 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>El servicio de backup RCON para realizar copias de seguridad.</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="broadcastRconToOps" className="text-gray-200 font-minecraft text-sm">
                      Difundir RCON a OPs
                    </Label>
                    <Switch id="broadcastRconToOps" checked={config.broadcastRconToOps || false} onCheckedChange={(checked) => updateConfig("broadcastRconToOps", checked)} />
                  </div>
                  <p className="text-xs text-gray-400">Difunde los comandos RCON ejecutados a los operadores conectados</p>
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="space-y-4 p-4 rounded-md bg-gray-800/50 border border-gray-700/50 mt-4">
        <h3 className="text-lg text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/nether.webp" alt="Permisos" width={20} height={20} />
          Permisos Adicionales
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="commandBlock" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/command-block.webp" alt="Bloques de Comandos" width={16} height={16} />
              Bloques de Comandos
            </Label>
            <Switch id="commandBlock" checked={config.commandBlock || false} onCheckedChange={(checked) => updateConfig("commandBlock", checked)} />
          </div>
          <p className="text-xs text-gray-400">Habilita el uso de bloques de comandos</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="allowFlight" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/elytra.webp" alt="Vuelo" width={16} height={16} />
              Permitir Vuelo
            </Label>
            <Switch id="allowFlight" checked={config.allowFlight || false} onCheckedChange={(checked) => updateConfig("allowFlight", checked)} />
          </div>
          <p className="text-xs text-gray-400">Permite a los jugadores volar (si tienen habilitado el modo creativo o mods de vuelo)</p>
        </div>
      </div>
    </>
  );
};
