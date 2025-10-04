/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Info, Save, HelpCircle } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";

interface ModsTabProps {
  config: ServerConfig;
  updateConfig: (field: keyof ServerConfig, value: any) => void;
  onSave: () => Promise<boolean>;
}

export const ModsTab: FC<ModsTabProps> = ({ config, updateConfig, onSave }) => {
  const { t } = useLanguage();
  const isCurseForge = config.serverType === "AUTO_CURSEFORGE";
  const isManualCurseForge = config.serverType === "CURSEFORGE";
  const isForge = config.serverType === "FORGE";

  if (!isCurseForge && !isForge && !isManualCurseForge) {
    return (
      <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
            <Image src="/images/gold.webp" alt="Mods" width={24} height={24} className="opacity-90" />
            {t("modsConfig")}
          </CardTitle>
          <CardDescription className="text-gray-300">{t("modsNotAvailable")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 border border-gray-700/50 rounded-md bg-gray-800/50 gap-3 p-6">
            <Image src="/images/crafting-table.webp" alt="Mods" width={48} height={48} className="opacity-80" />
            <p className="text-gray-400 text-center font-minecraft text-sm">{t("modsSelectServerType")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/gold.webp" alt="Mods" width={24} height={24} className="opacity-90" />
          {t("modsConfig")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("modsConfigDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isForge && (
          <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
            <Label htmlFor="forgeBuild" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/anvil.webp" alt="Forge" width={16} height={16} />
              Versión de Forge
            </Label>
            <Input id="forgeBuild" value={config.forgeBuild} onChange={(e) => updateConfig("forgeBuild", e.target.value)} placeholder="43.2.0" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
            <p className="text-xs text-gray-400">Número de build de Forge para la versión de Minecraft seleccionada</p>
          </div>
        )}

        {isManualCurseForge && (
          <>
            <div className="bg-amber-900/30 border border-amber-700/30 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300 font-minecraft">Función obsoleta (Deprecated)</p>
                  <p className="text-xs text-amber-200/80 mt-1">Este método manual para CurseForge está obsoleto. Se recomienda usar &quot;CurseForge Modpack&quot; (AUTO_CURSEFORGE) para nuevas instalaciones. Este modo requiere que subas manualmente los archivos de modpack al servidor.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfServerMod" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/chest.webp" alt="Modpack" width={16} height={16} />
                  Archivo del Modpack (CF_SERVER_MOD)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                      <p>Ruta completa al archivo .zip del modpack en el contenedor.</p>
                      <p className="mt-1 text-xs">Ejemplo: /modpacks/SkyFactory_4_Server_4.1.0.zip</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="cfServerMod" value={config.cfServerMod || ""} onChange={(e) => updateConfig("cfServerMod", e.target.value)} placeholder="/modpacks/SkyFactory_4_Server_4.1.0.zip" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">Ruta al archivo ZIP del modpack de CurseForge dentro del contenedor</p>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfBaseDir" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/ender_chest.webp" alt="Directorio" width={16} height={16} />
                  Directorio Base (CF_BASE_DIR)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>Directorio donde se expandirá el modpack. Por defecto: /data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="cfBaseDir" value={config.cfBaseDir || "/data/FeedTheBeast"} onChange={(e) => updateConfig("cfBaseDir", e.target.value)} placeholder="/data/FeedTheBeast" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">Directorio donde se extraerá y ejecutará el modpack</p>
            </div>

            <div className="space-y-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="useModpackStartScript" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/command-block.webp" alt="Script" width={16} height={16} />
                  Usar Script de Inicio del Modpack
                </Label>
                <Switch id="useModpackStartScript" checked={config.useModpackStartScript ?? true} onCheckedChange={(checked) => updateConfig("useModpackStartScript", checked)} />
              </div>
              <p className="text-xs text-gray-400">Si se desactiva, evita usar el script de inicio incluido en el modpack y usa la lógica estándar del servidor</p>
            </div>

            <div className="space-y-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="ftbLegacyJavaFixer" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/redstone.webp" alt="Java Fixer" width={16} height={16} />
                  FTB Legacy Java Fixer
                </Label>
                <Switch id="ftbLegacyJavaFixer" checked={config.ftbLegacyJavaFixer ?? false} onCheckedChange={(checked) => updateConfig("ftbLegacyJavaFixer", checked)} />
              </div>
              <p className="text-xs text-gray-400">Activa la corrección para modpacks que fallan con &quot;unable to launch forgemodloader&quot;</p>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfApiKeyManual" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} />
                  API Key de CurseForge (CF_API_KEY)
                </Label>
              </div>
              <Input id="cfApiKeyManual" value={config.cfApiKey || ""} onChange={(e) => updateConfig("cfApiKey", e.target.value)} placeholder="$2a$10$Iao..." type="password" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">API Key opcional para compatibilidad con algunos modpacks</p>
              <p className="text-xs text-amber-300 mt-1 font-minecraft">
                Si tu API Key contiene <b>$</b>, debes escribirla con doble <b>$</b> (ejemplo: <code>$$2a$$10$$...</code>) en el archivo <b>.env</b>.
              </p>
            </div>
          </>
        )}

        {isCurseForge && (
          <>
            <div className="bg-amber-900/30 border border-amber-700/30 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300 font-minecraft">Información importante</p>
                  <p className="text-xs text-amber-200/80 mt-1">Para utilizar correctamente la funcionalidad de CurseForge, se requiere una API Key. La API key es necesaria para descargar modpacks privados o con restricciones.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfMethod" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/compass.webp" alt="Método" width={16} height={16} />
                  Método de Instalación
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md bg-gray-800 border-gray-700 text-gray-200">
                      <p>Selecciona cómo quieres obtener el modpack:</p>
                      <ul className="list-disc pl-4 mt-1 text-xs">
                        <li>
                          <strong>URL:</strong> Dirección web directa al modpack en CurseForge
                        </li>
                        <li>
                          <strong>Slug:</strong> Identificador único del modpack (ej: &quot;all-the-mods-7&quot;)
                        </li>
                        <li>
                          <strong>Archivo:</strong> Instalar desde un archivo .zip ya subido al servidor
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div className={`p-4 border rounded-md cursor-pointer transition-colors hover:bg-gray-700/30 ${config.cfMethod === "url" ? "border-emerald-500/50 bg-emerald-600/10" : "border-gray-700/50"}`} onClick={() => updateConfig("cfMethod", "url")}>
                  <p className="font-minecraft text-sm text-gray-200">URL</p>
                  <p className="text-xs text-gray-400 mt-1">Instalar desde URL directa</p>
                </div>
                <div className={`p-4 border rounded-md cursor-pointer transition-colors hover:bg-gray-700/30 ${config.cfMethod === "slug" ? "border-emerald-500/50 bg-emerald-600/10" : "border-gray-700/50"}`} onClick={() => updateConfig("cfMethod", "slug")}>
                  <p className="font-minecraft text-sm text-gray-200">Slug</p>
                  <p className="text-xs text-gray-400 mt-1">Usar ID/slug del modpack</p>
                </div>
                <div className={`p-4 border rounded-md cursor-pointer transition-colors hover:bg-gray-700/30 ${config.cfMethod === "file" ? "border-emerald-500/50 bg-emerald-600/10" : "border-gray-700/50"}`} onClick={() => updateConfig("cfMethod", "file")}>
                  <p className="font-minecraft text-sm text-gray-200">Archivo</p>
                  <p className="text-xs text-gray-400 mt-1">Usar archivo local en el servidor</p>
                </div>
              </div>
            </div>

            {config.cfMethod === "url" && (
              <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cfUrl" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                    <Image src="/images/ender-pearl.webp" alt="URL" width={16} height={16} />
                    URL del Modpack (CF_PAGE_URL)
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>URL completa a la página del modpack o a un archivo específico.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input id="cfUrl" value={config.cfUrl} onChange={(e) => updateConfig("cfUrl", e.target.value)} placeholder="https://www.curseforge.com/minecraft/modpacks/all-the-mods-7/download/3855588" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                <p className="text-xs text-gray-400">URL directa de descarga del modpack de CurseForge</p>
              </div>
            )}

            {config.cfMethod === "slug" && (
              <>
                <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cfSlug" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                      <Image src="/images/nether.webp" alt="Slug" width={16} height={16} />
                      Proyecto de CurseForge (CF_SLUG)
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>El identificador (slug) del modpack en CurseForge.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input id="cfSlug" value={config.cfSlug} onChange={(e) => updateConfig("cfSlug", e.target.value)} placeholder="all-the-mods-7" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                  <p className="text-xs text-gray-400">Nombre del proyecto o slug en CurseForge</p>
                </div>

                <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cfFile" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                      <Image src="/images/paper.webp" alt="ID" width={16} height={16} />
                      ID del Archivo (CF_FILE_ID)
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                          <p>ID numérico del archivo específico a descargar. Si se omite, se usará la versión más reciente.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input id="cfFile" value={config.cfFile} onChange={(e) => updateConfig("cfFile", e.target.value)} placeholder="3855588" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                  <p className="text-xs text-gray-400">ID específico del archivo a descargar. Si se deja en blanco, se usará la última versión.</p>
                </div>
              </>
            )}

            {config.cfMethod === "file" && (
              <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cfFilenameMatcher" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                    <Image src="/images/book.webp" alt="Archivo" width={16} height={16} />
                    Patrón de Archivo (CF_FILENAME_MATCHER)
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                        <p>Especifica un substring para encontrar el archivo deseado en la carpeta /modpacks.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input id="cfFilenameMatcher" value={config.cfFilenameMatcher} onChange={(e) => updateConfig("cfFilenameMatcher", e.target.value)} placeholder="*.zip" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                <p className="text-xs text-gray-400">Patrón para encontrar el archivo del modpack en la carpeta /modpacks</p>
              </div>
            )}

            <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfApiKey" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                  <Image src="/images/diamond.webp" alt="API Key" width={16} height={16} />
                  API Key de CurseForge (CF_API_KEY)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <p>API Key de CurseForge (Eternal) requerida para descargar algunos modpacks.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="cfApiKey" value={config.cfApiKey} onChange={(e) => updateConfig("cfApiKey", e.target.value)} placeholder="$2a$10$Iao..." type="password" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
              <p className="text-xs text-gray-400">API Key para descargar modpacks restringidos (requerida para la mayoría de modpacks)</p>
            </div>

            <Accordion type="single" collapsible className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md">
              <AccordionItem value="advanced" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-gray-200 font-minecraft text-sm hover:bg-gray-700/30 rounded-t-md">
                  <div className="flex items-center gap-2">
                    <Image src="/images/compass.webp" alt="Avanzado" width={16} height={16} />
                    Opciones Avanzadas
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfSync" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/observer.webp" alt="Sincronizar" width={16} height={16} />
                        Sincronizar CurseForge (CF_FORCE_SYNCHRONIZE)
                      </Label>
                      <Switch id="cfSync" checked={config.cfSync} onCheckedChange={(checked) => updateConfig("cfSync", checked)} />
                    </div>
                    <p className="text-xs text-gray-400">Sincroniza automáticamente actualizaciones del modpack cuando el servidor se reinicia</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfParallelDownloads" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/hopper.webp" alt="Descargas" width={16} height={16} />
                        Descargas Paralelas (CF_PARALLEL_DOWNLOADS)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <p>Número de descargas de mods que se realizarán en paralelo. Valor por defecto: 4</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={config.cfParallelDownloads || "4"} onValueChange={(value) => updateConfig("cfParallelDownloads", value)}>
                      <SelectTrigger className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30">
                        <SelectValue placeholder="4" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-gray-200 ">
                        <SelectItem value="1">1 descarga</SelectItem>
                        <SelectItem value="2">2 descargas</SelectItem>
                        <SelectItem value="4">4 descargas (recomendado)</SelectItem>
                        <SelectItem value="6">6 descargas</SelectItem>
                        <SelectItem value="8">8 descargas</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">Especifica cuántas descargas paralelas de mods realizar</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfOverridesSkipExisting" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/redstone.webp" alt="Omitir" width={16} height={16} />
                        Omitir Archivos Existentes (CF_OVERRIDES_SKIP_EXISTING)
                      </Label>
                      <Switch id="cfOverridesSkipExisting" checked={config.cfOverridesSkipExisting} onCheckedChange={(checked) => updateConfig("cfOverridesSkipExisting", checked)} />
                    </div>
                    <p className="text-xs text-gray-400">Si se activa, los archivos que ya existen en el directorio de datos no son reemplazados</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfSetLevelFrom" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/elytra.webp" alt="Nivel" width={16} height={16} />
                        Configurar Nivel Desde (CF_SET_LEVEL_FROM)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <p>Determina cómo establecer los datos del mundo desde el modpack.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={config.cfSetLevelFrom || "none"} onValueChange={(value) => updateConfig("cfSetLevelFrom", value === "none" ? "" : value)}>
                      <SelectTrigger className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30">
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-gray-200 border-gray-700">
                        <SelectItem value="none">No configurar</SelectItem>
                        <SelectItem value="WORLD_FILE">Archivo de Mundo</SelectItem>
                        <SelectItem value="OVERRIDES">Overrides del Modpack</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">Configura cómo obtener los datos del mundo desde el modpack</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfForceInclude" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/chest.webp" alt="Incluir" width={16} height={16} />
                        Forzar Inclusión de Mods (CF_FORCE_INCLUDE_MODS)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                            <p>Lista de mods (separados por espacios o líneas) para incluir forzosamente, independientemente del modpack IDs o Slugs.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea id="cfForceInclude" value={config.cfForceInclude} onChange={(e) => updateConfig("cfForceInclude", e.target.value)} placeholder="699872,228404" className="min-h-20 bg-gray-800/70 border-gray-700/50 text-gray-200 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                    <p className="text-xs text-gray-400">Lista de mods que siempre se incluirán incluso si no están en el modpack IDs o Slugs (uno por línea)</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cfExclude" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
                        <Image src="/images/barrier.webp" alt="Excluir" width={16} height={16} />
                        Excluir Mods (CF_EXCLUDE_MODS)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-800 border-gray-700 text-gray-200">
                            <p>Lista de mods (separados por espacios o líneas) que serán excluidos del modpack IDs o Slugs.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea id="cfExclude" value={config.cfExclude} onChange={(e) => updateConfig("cfExclude", e.target.value)} placeholder="699872,228404" className="min-h-20 text-gray-200 bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
                    <p className="text-xs text-gray-400">Lista de mods que se excluirán del modpack IDs o Slugs (uno por línea, admite patrones glob)</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-end pt-4 border-t border-gray-700/40">
        <Button type="button" onClick={onSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
          <Save className="h-4 w-4" />
          {t("saveConfiguration")}
        </Button>
      </CardFooter>
    </Card>
  );
};
