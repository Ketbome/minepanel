"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/organisms/Sidebar";
import { DashboardHeader } from "@/components/organisms/DashboardHeader";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUIStore } from "@/lib/store/ui-store";

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
      <div className="flex min-h-screen bg-[#0a0d09] items-center justify-center">
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
      <div className="absolute inset-0 bg-[#0a0d09]/78"></div>

      <Sidebar />

      <div
        className={`flex flex-col relative z-10 transition-all duration-300 min-w-0 ${
          isSidebarCollapsed ? "ml-16 w-[calc(100%-4rem)]" : "ml-64 w-[calc(100%-16rem)]"
        }`}
      >
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto min-w-0">
          <div className="max-w-7xl mx-auto animate-fade-in min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
