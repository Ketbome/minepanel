"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "../../lib/hooks/useLanguage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="bg-gradient-to-br from-emerald-700/80 to-gray-900/90 border-emerald-600/70 text-emerald-300 hover:from-emerald-600 hover:to-gray-800 hover:text-white focus:ring-emerald-500 focus:border-emerald-500 shadow-md">
          <Globe className="h-[1.2rem] w-[1.2rem] text-emerald-300 group-hover:text-white transition-colors" />
          <span className="sr-only">{t("language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-900/95 border border-emerald-700/40 shadow-lg rounded-md">
        <DropdownMenuItem onClick={() => setLanguage("es")} className={`flex items-center gap-2 px-3 py-2 rounded font-minecraft text-sm transition-colors ${language === "es" ? "bg-emerald-700/80 text-white" : "hover:bg-emerald-800/60 hover:text-emerald-200 text-emerald-300"}`}>
          <span>🇪🇸</span> {t("spanish")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("en")} className={`flex items-center gap-2 px-3 py-2 rounded font-minecraft text-sm transition-colors ${language === "en" ? "bg-emerald-700/80 text-white" : "hover:bg-emerald-800/60 hover:text-emerald-200 text-emerald-300"}`}>
          <span>🇺🇸</span> {t("english")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("nl")} className={`flex items-center gap-2 px-3 py-2 rounded font-minecraft text-sm transition-colors ${language === "nl" ? "bg-emerald-700/80 text-white" : "hover:bg-emerald-800/60 hover:text-emerald-200 text-emerald-300"}`}>
          <span>🇳🇱</span> {t("dutch")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
