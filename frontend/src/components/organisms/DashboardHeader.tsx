"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown } from "lucide-react";
import { logout } from "@/services/auth/auth.service";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "../ui/language-switcher";
import { useLanguage } from "@/lib/hooks/useLanguage";

export function DashboardHeader() {
  const { t } = useLanguage();
  const router = useRouter();
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
    router.push("/");
  };

  return (
    <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="sticky top-0 z-40 w-full border-b border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-lg">
      <div className="flex h-16 items-center justify-end px-6">
        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300 font-minecraft">{t("systemActive")}</span>
          </div>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-800/60 p-2" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center overflow-hidden">
                <Image src="/images/player-head.png" alt="User" width={32} height={32} className="rounded-full object-cover" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white font-minecraft">{t("admin")}</p>
                <p className="text-xs text-gray-400">{t("administrator")}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </Button>

            {/* User Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }} className="absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl z-50">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Minecraft decoration */}
          <div className="hidden lg:flex items-center gap-2">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
              <Image src="/images/diamond.webp" alt="Diamond" width={24} height={24} className="opacity-70" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
