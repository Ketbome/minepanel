"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown } from "lucide-react";
import { LanguageSwitcher } from "../ui/language-switcher";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  const { t } = useLanguage();
  const logout = useAuthStore((state) => state.logout);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-lg animate-fade-in">
      <div className="flex h-16 items-center justify-end px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300 font-minecraft">{t("systemActive")}</span>
          </div>

          <div className="relative" ref={menuRef}>
            <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-800/60 p-2" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center overflow-hidden">
                <Image src="/images/player-head.png" alt="User" width={32} height={32} className="rounded-full object-cover" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white font-minecraft">{t("admin")}</p>
                <p className="text-xs text-gray-400">{t("administrator")}</p>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform duration-200", showUserMenu && "rotate-180")} />
            </Button>

            {/* Dropdown menu with CSS transitions */}
            <div className={cn(
              "absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl z-50",
              "transition-all duration-200 origin-top-right",
              showUserMenu ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
            )}>
              <div className="flex items-center gap-3 p-4 border-b border-gray-700">
                <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center overflow-hidden">
                  <Image src="/images/player-head.png" alt="User" width={40} height={40} className="rounded-full object-cover" />
                </div>
                <div>
                  <p className="font-medium font-minecraft text-white">{t("admin")}</p>
                </div>
              </div>
              <div className="flex flex-row items-center py-1 text-white px-2">
                <LanguageSwitcher /> <p className="px-2">{t("changeLanguage")}</p>
              </div>
              <div className="py-2">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors">
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="animate-float">
              <Image src="/images/diamond.webp" alt="Diamond" width={24} height={24} className="opacity-70" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
