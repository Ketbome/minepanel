"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/organisms/Sidebar";
import { DashboardHeader } from "@/components/organisms/DashboardHeader";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useAuthStore, useUIStore } from "@/lib/store";

interface DashboardShellProps {
  readonly children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { isSidebarCollapsed, isHydrated, setHydrated } = useUIStore();

  useEffect(() => {
    initialize();
    setHydrated(true);
  }, [initialize, setHydrated]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isHydrated || isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">{!isHydrated ? t("initializing") : t("verifyingAuth")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[url('/images/background.webp')] bg-cover bg-fixed bg-center relative">
      <div className="absolute inset-0 bg-black/60"></div>

      <Sidebar />

      <div className={`flex-1 flex flex-col relative z-10 transition-all duration-300 ${isSidebarCollapsed ? "ml-16" : "ml-64"}`}>
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
