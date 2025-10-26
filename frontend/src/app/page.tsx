"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated, login } from "@/services/auth/auth.service";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        toast.success(t("loginSuccess"));
        router.push("/dashboard");
      } else {
        const errorKey = result.error as string;
        const hasTranslation = errorKey && ["NO_ACCESS_TOKEN", "LOGIN_ERROR", "invalidCredentials"].includes(errorKey);
        const errorMessage = hasTranslation ? t(errorKey as "NO_ACCESS_TOKEN" | "LOGIN_ERROR" | "invalidCredentials") : t("invalidCredentials");
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error en login:", error);
      toast.error(t("connectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[url('/images/minecraft-bg-blur.png')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <header className="relative z-10 border-b border-gray-800/60 bg-black/30 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6 sm:px-8 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <Image src="/images/minecraft-logo.webp" alt="Minecraft Logo" width={40} height={40} className="rounded" />
            <span className="text-xl bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent font-minecraft">Minepanel</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-md w-full">
          <div className="space-y-4 text-center mb-6">
            <h1 className="text-4xl font-bold text-white font-minecraft drop-shadow-glow">{t("welcome")}</h1>
            <p className="text-gray-200">{t("welcomeDescription")}</p>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
            <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
              <form onSubmit={handleSubmit}>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-2xl font-minecraft text-gray-100">{t("login")}</CardTitle>
                  <CardDescription className="text-gray-300">{t("enterCredentials")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-200">
                        {t("username")}
                      </Label>
                      <div className="relative">
                        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("username").toLowerCase()} required autoComplete="username" className="bg-gray-800/80 border-gray-700 focus:border-emerald-500 pl-10 text-gray-100" />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-200">
                        {t("password")}
                      </Label>
                      <div className="relative">
                        <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="bg-gray-800/80 border-gray-700 focus:border-emerald-500 pl-10 text-gray-100" />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pb-6 pt-2">
                  <Button type="submit" className="w-full font-minecraft bg-emerald-600 hover:bg-emerald-700 text-white py-2 transition-all" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
                        <span>{t("loading")}</span>
                      </div>
                    ) : (
                      t("enterServer")
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>

          <div className="mt-8 flex justify-center space-x-4">
            <Image src="/images/grass.webp" alt="Grass Block" width={40} height={40} className="animate-bounce" style={{ animationDelay: "0.1s", animationDuration: "2s" }} />
            <Image src="/images/diamond.webp" alt="Diamond" width={40} height={40} className="animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "2.4s" }} />
            <Image src="/images/creeper.webp" alt="Creeper" width={20} height={40} className="animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "2.2s" }} />
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 py-4 border-t border-gray-800/60 bg-black/30 backdrop-blur-md">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left max-w-7xl mx-auto">
          <p className="text-sm text-gray-300">
            &copy; {new Date().getFullYear()} Minepanel. {t("allRightsReserved")}
          </p>
          <div className="flex space-x-4 text-gray-300">
            <Link href="#" className="hover:text-emerald-400 transition-colors">
              {t("help")}
            </Link>
            <Link href="#" className="hover:text-emerald-400 transition-colors">
              {t("privacy")}
            </Link>
            <Link href="#" className="hover:text-emerald-400 transition-colors">
              {t("terms")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
