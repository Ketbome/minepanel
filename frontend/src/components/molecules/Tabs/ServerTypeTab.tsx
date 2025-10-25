import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ServerConfig } from "@/lib/types/types";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ServerTypeTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ServerTypeTab: FC<ServerTypeTabProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const isCurseForge = config.serverType === "AUTO_CURSEFORGE" || config.serverType === "CURSEFORGE";

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/server-icon.png" alt="Server Type" width={24} height={24} className="opacity-90" />
          {t("serverType")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("serverTypeDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isCurseForge && (
          <div className="space-y-2 p-4 rounded-md bg-emerald-900/10 border-2 border-emerald-500/30 text-white">
            <Label htmlFor="minecraftVersion" className="text-emerald-400 font-minecraft text-sm flex items-center gap-2 text-white">
              <Image src="/images/diamond.webp" alt="Versión" width={16} height={16} />
              {t("minecraftVersion")}
            </Label>
            <Input id="minecraftVersion" value={config.minecraftVersion} onChange={(e) => updateConfig("minecraftVersion", e.target.value)} placeholder="1.20.4" className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
            <p className="text-xs text-gray-400">{t("minecraftVersionDesc")}</p>
          </div>
        )}

        {/* Docker Image */}
        <div className="space-y-2 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="dockerImage" className="text-gray-200 font-minecraft text-sm flex items-center gap-2">
              <Image src="/images/barrier.webp" alt="Docker" width={16} height={16} />
              {t("dockerImage")}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 bg-transparent hover:bg-gray-700/50">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                  <p>{t("dockerImageDesc")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input id="dockerImage" value={config.dockerImage} onChange={(e) => updateConfig("dockerImage", e.target.value)} placeholder="java17" className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30" />
          <div className="space-y-1">
            <p className="text-xs text-gray-400">{t("dockerImageHelp")}</p>
            <div className="flex items-center gap-2 p-2 bg-blue-900/30 border border-blue-700/50 rounded">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-xs text-blue-300">
                <span>{t("dockerImageHelpTags")}: </span>
                <a href="https://docker-minecraft-server.readthedocs.io/en/latest/versions/java/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                  {t("dockerImageHelpDocumentation")}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700/50 pt-4">
          <h3 className="text-sm font-minecraft text-gray-300 mb-4">{t("selectType")}</h3>
          <RadioGroup value={config.serverType} onValueChange={(value: ServerConfig["serverType"]) => updateConfig("serverType", value)} className="space-y-4">
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
                <p className="text-sm text-gray-300 mt-1">{t("serverSpigot")}</p>
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
                <p className="text-sm text-gray-300 mt-1">{t("serverPaper")}</p>
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
                <p className="text-sm text-gray-300 mt-1">{t("serverBukkit")}</p>
              </div>
            </motion.div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};
