"use client";

import { Check, Globe } from "lucide-react";
import { useLanguage } from "../../lib/hooks/useLanguage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";

const languages = [
  { code: "es" as const, label: "spanish", flag: "🇪🇸", name: "Español" },
  { code: "en" as const, label: "english", flag: "🇺🇸", name: "English" },
  { code: "nl" as const, label: "dutch", flag: "🇳🇱", name: "Nederlands" },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const currentLanguage = languages.find((lang) => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 font-minecraft">
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-400" />
            <span className="text-lg">{currentLanguage?.flag}</span>
            <span>{currentLanguage?.name}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-gray-800 border-gray-700">
        {languages.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => setLanguage(lang.code)} className={`flex items-center justify-between px-3 py-2.5 cursor-pointer font-minecraft text-sm transition-colors ${language === lang.code ? "bg-purple-600/30 text-purple-300" : "text-gray-300 hover:bg-gray-700/60 hover:text-white"}`}>
            <span className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
            {language === lang.code && <Check className="h-4 w-4 text-purple-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
