"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { LogOut, ChevronDown } from "lucide-react";
import { LanguageSwitcher } from "../ui/language-switcher";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import { getSessionUser, type SessionUser } from "@/services/auth/auth.service";
import { GitHubStarButton } from "@/components/molecules/GitHubStarButton";

export function DashboardHeader() {
  const { t } = useLanguage();
  const logout = useAuthStore((state) => state.logout);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
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

  useEffect(() => {
    getSessionUser()
      .then(setSessionUser)
      .catch((error) => {
        console.error("Error loading session user:", error);
        setSessionUser(null);
      });
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-40 w-full mc-titlebar bg-[var(--mc-stone)]/95 backdrop-blur-md animate-fade-in">
      <div className="flex h-16 items-center justify-end px-6 gap-3">
        <GitHubStarButton label={t("github")} />

        <div className="mc-slot hidden sm:flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-200 font-minecraft">{t("systemActive")}</span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-3 px-2.5 py-1.5 border-2 transition-colors font-minecraft",
              showUserMenu ? "border-[var(--mc-frame)] bg-emerald-600/20" : "border-transparent hover:border-[var(--mc-frame)] hover:bg-black/30",
            )}
          >
            <div className="mc-slot h-9 w-9 flex items-center justify-center overflow-hidden">
              <Image src="/images/player-head.png" alt="User" width={28} height={28} className="pixelated object-cover" />
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-sm font-medium text-white">{sessionUser?.username || "..."}</p>
              <p className="text-[11px] text-gray-400">{sessionUser?.role === "ADMIN" ? t("administrator") : t("userLabel")}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform duration-200", showUserMenu && "rotate-180")} />
          </button>

            {/* Dropdown menu with CSS transitions */}
            <div className={cn(
              "absolute right-0 mt-2 w-56 z-50 bg-[var(--mc-stone)] border-2 border-[var(--mc-frame)]",
              "shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),inset_-2px_-2px_0_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.55)]",
              "transition-all duration-200 origin-top-right",
              showUserMenu ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
            )}>
              <div className="mc-titlebar flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center overflow-hidden">
                  <Image src="/images/player-head.png" alt="User" width={40} height={40} className="rounded-full object-cover" />
                </div>
                <div>
                  <p className="font-medium font-minecraft text-white">{sessionUser?.username || "..."}</p>
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
    </header>
  );
}
