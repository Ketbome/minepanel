"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/services/auth/auth.service";
import { motion } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

export function Header() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUsername = localStorage.getItem("username");
      if (storedUsername) {
        setUsername(storedUsername);
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="relative z-10 border-b border-gray-800/60 bg-black/30 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6 sm:px-8 max-w-7xl mx-auto">
        <Link href="/dashboard/home" className="flex items-center gap-3 font-bold">
          <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
            <Image src="/images/minecraft-logo.webp" alt="Minecraft Logo" width={40} height={40} className="rounded" />
          </motion.div>
          <span className="text-xl bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent font-minecraft">Minepanel</span>
        </Link>

        <div className="flex items-center gap-4">
          {username && (
            <div className="flex items-center gap-2 bg-gray-800/40 px-3 py-1.5 rounded-md border border-gray-700/50">
              <User className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-gray-200 hidden md:inline font-minecraft">{username}</span>
            </div>
          )}
          <Button variant="outline" onClick={handleLogout} className="border-gray-700/50 bg-gray-800/40 text-gray-200 hover:bg-red-600/20 hover:text-red-400 hover:border-red-600/50 transition-all flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("logout")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
