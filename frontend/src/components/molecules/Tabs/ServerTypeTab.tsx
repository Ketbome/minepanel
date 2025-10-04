/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ServerTypeTabProps {
  config: ServerConfig;
  updateConfig: (field: keyof ServerConfig, value: any) => void;
  onSave: () => Promise<boolean>;
}

export const ServerTypeTab: FC<ServerTypeTabProps> = ({ config, updateConfig, onSave }) => {
  const { t } = useLanguage();
  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/server-icon.png" alt="Server Type" width={24} height={24} className="opacity-90" />
          {t("serverType")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("serverTypeDescription")}</CardDescription>
      </CardHeader>

      <CardContent>
        <RadioGroup value={config.serverType} onValueChange={(value) => updateConfig("serverType", value)} className="space-y-4">
          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`flex items-start space-x-4 rounded-md p-4 ${config.serverType === "VANILLA" ? "bg-emerald-600/10 border border-emerald-600/30" : "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 flex-shrink-0">
              <Image src="/images/grass.webp" alt="Vanilla" width={24} height={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="VANILLA" id="vanilla" className="border-emerald-600/50" />
                <Label htmlFor="vanilla" className="text-base font-medium text-gray-100 font-minecraft">
                  Vanilla
                </Label>
              </div>
              <p className="text-sm text-gray-300 mt-1">{t("serverVanilla")}</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`flex items-start space-x-4 rounded-md p-4 ${config.serverType === "FORGE" ? "bg-emerald-600/10 border border-emerald-600/30" : "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 flex-shrink-0">
              <Image src="/images/anvil.webp" alt="Forge" width={24} height={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FORGE" id="forge" className="border-emerald-600/50" />
                <Label htmlFor="forge" className="text-base font-medium text-gray-100 font-minecraft">
                  Forge
                </Label>
              </div>
              <p className="text-sm text-gray-300 mt-1">{t("serverForge")}</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`flex items-start space-x-4 rounded-md p-4 ${config.serverType === "AUTO_CURSEFORGE" ? "bg-emerald-600/10 border border-emerald-600/30" : "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 flex-shrink-0">
              <Image src="/images/enchanted-book.webp" alt="CurseForge" width={24} height={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="AUTO_CURSEFORGE" id="curseforge" className="border-emerald-600/50" />
                <Label htmlFor="curseforge" className="text-base font-medium text-gray-100 font-minecraft">
                  CurseForge Modpack
                </Label>
              </div>
              <p className="text-sm text-gray-300 mt-1">{t("serverCurseForge")}</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`flex items-start space-x-4 rounded-md p-4 ${config.serverType === "CURSEFORGE" ? "bg-amber-600/10 border border-amber-600/30" : "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 flex-shrink-0">
              <Image src="/images/book.webp" alt="CurseForge Manual" width={24} height={24} />
              <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1 rounded text-[8px] font-bold">LEGACY</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CURSEFORGE" id="curseforge-manual" className="border-amber-600/50" />
                <Label htmlFor="curseforge-manual" className="text-base font-medium text-gray-100 font-minecraft">
                  CurseForge Manual (Deprecated)
                </Label>
              </div>
              <p className="text-sm text-gray-300 mt-1">{t("serverCurseForgeManual")}</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`flex items-start space-x-4 rounded-md p-4 ${config.serverType === "SPIGOT" ? "bg-emerald-600/10 border border-emerald-600/30" : "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 flex-shrink-0">
              <Image src="/images/redstone.webp" alt="Spigot" width={24} height={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SPIGOT" id="spigot" className="border-emerald-600/50" />
                <Label htmlFor="spigot" className="text-base font-medium text-gray-100 font-minecraft">
                  Spigot
                </Label>
              </div>
              <p className="text-sm text-gray-300 mt-1">Servidor optimizado compatible con plugins de Bukkit</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`flex items-start space-x-4 rounded-md p-4 ${config.serverType === "PAPER" ? "bg-emerald-600/10 border border-emerald-600/30" : "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 flex-shrink-0">
              <Image src="/images/paper.webp" alt="Paper" width={24} height={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PAPER" id="paper" className="border-emerald-600/50" />
                <Label htmlFor="paper" className="text-base font-medium text-gray-100 font-minecraft">
                  Paper
                </Label>
              </div>
              <p className="text-sm text-gray-300 mt-1">Servidor de alto rendimiento basado en Spigot con optimizaciones adicionales</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`flex items-start space-x-4 rounded-md p-4 ${config.serverType === "BUKKIT" ? "bg-emerald-600/10 border border-emerald-600/30" : "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-md bg-gray-800/70 border border-gray-700/50 flex-shrink-0">
              <Image src="/images/emerald.webp" alt="Bukkit" width={24} height={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="BUKKIT" id="bukkit" className="border-emerald-600/50" />
                <Label htmlFor="bukkit" className="text-base font-medium text-gray-100 font-minecraft">
                  Bukkit
                </Label>
              </div>
              <p className="text-sm text-gray-300 mt-1">Servidor clásico con soporte de plugins API estándar</p>
            </div>
          </motion.div>
        </RadioGroup>
      </CardContent>

      <CardFooter className="flex justify-end pt-4 border-t border-gray-700/40">
        <Button type="button" onClick={onSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
          <Save className="mr-2 h-4 w-4" />
          Guardar
        </Button>
      </CardFooter>
    </Card>
  );
};
