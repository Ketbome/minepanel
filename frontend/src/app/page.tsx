"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated, login } from "@/services/auth/auth.service";
import { healthService } from "@/services/health.service";
import { m } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ConnectionErrorDialog } from "@/components/ui/connection-error-dialog";
import { LINK, LINK_DOCUMENTATION, LINK_GITHUB, LINK_FORGOT_PASSWORD } from "@/lib/providers/constants";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard/home");
    }
  }, [router]);

  const checkHealth = useCallback(async () => {
    try {
      await healthService();
      setServerAvailable(true);
      setShowErrorDialog(false);
    } catch (err) {
      console.error("Error:", err);
      setServerAvailable(false);
      setShowErrorDialog(true);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        mcToast.success(t("loginSuccess"));
        router.push("/dashboard/home");
      } else {
        const errorKey = result.error as string;
        const hasTranslation = errorKey && ["NO_ACCESS_TOKEN", "LOGIN_ERROR", "invalidCredentials"].includes(errorKey);
        const errorMessage = hasTranslation ? t(errorKey as "NO_ACCESS_TOKEN" | "LOGIN_ERROR" | "invalidCredentials") : t("invalidCredentials");
        mcToast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error en login:", error);
      mcToast.error(t("connectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ConnectionErrorDialog isOpen={showErrorDialog} onRetry={checkHealth} />
      <div className="min-h-screen flex flex-col bg-[url('/images/background.webp')] bg-cover bg-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <m.div
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-20 left-10 opacity-20"
          >
            <Image src="/images/grass.webp" alt="" width={60} height={60} />
          </m.div>
          <m.div
            animate={{
              y: [0, 20, 0],
              x: [0, -15, 0],
              rotate: [0, -5, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute top-40 right-20 opacity-20"
          >
            <Image src="/images/diamond.webp" alt="" width={50} height={50} />
          </m.div>
          <m.div
            animate={{
              y: [0, -25, 0],
              x: [0, 12, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute bottom-32 left-1/4 opacity-15"
          >
            <Image src="/images/grass.webp" alt="" width={45} height={45} />
          </m.div>
          <m.div
            animate={{
              y: [0, 18, 0],
              rotate: [0, 10, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute bottom-20 right-1/4 opacity-15"
          >
            <Image src="/images/diamond.webp" alt="" width={55} height={55} />
          </m.div>
        </div>

        <header className="relative z-10 border-b border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-lg">
          <div className="flex h-16 items-center justify-between px-6 sm:px-8 max-w-7xl mx-auto">
            <Link href="/" className="flex items-center gap-3 font-bold group">
              <m.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                <Image src="/images/minecraft-logo.webp" alt="Minecraft Logo" width={40} height={40} className="rounded" priority />
              </m.div>
              <span className="text-xl bg-linear-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent font-minecraft group-hover:from-emerald-400 group-hover:to-green-500 transition-all">Minepanel</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-md w-full">
            <div className="space-y-4 text-center mb-8">
              <m.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl font-bold text-white font-minecraft"
                style={{
                  textShadow: "0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)",
                }}
              >
                {t("welcome")}
              </m.h1>
              <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }} className="text-gray-200 text-lg">
                {t("welcomeDescription")}
              </m.p>
            </div>

            <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.4 }} className="relative">
              {/* Efecto de brillo animado detrás del card */}
              <div className="absolute -inset-1 bg-linear-to-r from-emerald-600 via-green-500 to-emerald-600 rounded-lg opacity-30 blur-lg animate-pulse"></div>

              <Card className="relative border-2 border-emerald-600/30 bg-gray-900/95 backdrop-blur-md shadow-2xl shadow-emerald-900/20 hover:border-emerald-500/50 transition-all duration-300">
                <form onSubmit={handleSubmit}>
                  <CardHeader className="space-y-1 pb-4">
                    <CardTitle className="text-2xl font-minecraft text-white flex items-center gap-2">
                      {t("login")}
                      <m.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-emerald-500 rounded-full" />
                    </CardTitle>
                    <CardDescription className="text-gray-300">{t("enterCredentials")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-200 font-medium">
                          {t("username")}
                        </Label>
                        <div className="relative group">
                          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("username").toLowerCase()} required autoComplete="username" className="bg-gray-800/90 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pl-10 text-gray-100 transition-all" />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none group-focus-within:text-emerald-500 transition-colors">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-200 font-medium">
                          {t("password")}
                        </Label>
                        <div className="relative group">
                          <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="bg-gray-800/90 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pl-10 text-gray-100 transition-all" />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none group-focus-within:text-emerald-500 transition-colors">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-4 pt-2 flex-col space-y-3">
                    <Button type="submit" className="w-full font-minecraft bg-emerald-600 hover:bg-emerald-700 text-white py-2 transition-all hover:shadow-lg hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-[0.98]" disabled={isLoading || !serverAvailable}>
                      {(() => {
                        if (serverAvailable === null) {
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
                              <span>{t("checkingServerStatus")}</span>
                            </div>
                          );
                        }
                        if (isLoading) {
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
                              <span>{t("loading")}</span>
                            </div>
                          );
                        }
                        if (!serverAvailable) {
                          return t("serverUnavailable");
                        }
                        return t("enterServer");
                      })()}
                    </Button>
                    <a href={LINK_FORGOT_PASSWORD} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-emerald-400 transition-colors text-center">
                      {t("forgotPassword")}
                    </a>
                  </CardFooter>
                </form>
              </Card>
            </m.div>

            <div className="mt-10 flex justify-center items-center space-x-6">
              <m.div
                whileHover={{ scale: 1.2, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  y: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 },
                }}
              >
                <Image src="/images/grass.webp" alt="Grass Block" width={48} height={48} className="drop-shadow-lg" />
              </m.div>
              <m.div
                whileHover={{ scale: 1.2, rotate: -10 }}
                whileTap={{ scale: 0.9 }}
                animate={{ y: [0, -12, 0] }}
                transition={{
                  y: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
                }}
              >
                <Image src="/images/diamond.webp" alt="Diamond" width={48} height={48} className="drop-shadow-lg" />
              </m.div>
              <m.div
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                animate={{ y: [0, -8, 0] }}
                transition={{
                  y: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
                }}
              >
                <Image src="/images/creeper.webp" alt="Creeper" width={24} height={48} className="drop-shadow-lg" />
              </m.div>
            </div>
          </m.div>
        </main>

        <footer className="relative z-10 py-4 border-t border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-lg">
          <div className="container flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left max-w-7xl mx-auto">
            <p className="text-sm text-gray-300">
              &copy; {new Date().getFullYear()} Minepanel. {t("allRightsReserved")}
            </p>
            <div className="flex space-x-4 text-gray-300">
              <Link href={LINK} className="hover:text-emerald-400 transition-all hover:scale-105">
                {t("help")}
              </Link>
              <Link href={LINK_DOCUMENTATION} className="hover:text-emerald-400 transition-all hover:scale-105">
                {t("documentation")}
              </Link>
              <Link href={LINK_GITHUB} className="hover:text-emerald-400 transition-all hover:scale-105">
                {t("github")}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
