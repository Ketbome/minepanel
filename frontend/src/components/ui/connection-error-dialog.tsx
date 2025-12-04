"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, WifiOff, Server, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { LINK_DOCUMENTATION } from "@/lib/providers/constants";

interface ConnectionErrorDialogProps {
  readonly isOpen: boolean;
  readonly onRetry: () => void;
}

export function ConnectionErrorDialog({ isOpen, onRetry }: ConnectionErrorDialogProps) {
  const { t } = useLanguage();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetry();
    setTimeout(() => setIsRetrying(false), 2000);
  };

  const troubleshootingSteps = [
    {
      icon: Server,
      title: t("checkBackendUrl"),
      description: t("checkBackendUrlDesc"),
    },
    {
      icon: WifiOff,
      title: t("checkServerRunning"),
      description: t("checkServerRunningDesc"),
    },
    {
      icon: AlertCircle,
      title: t("checkDNS"),
      description: t("checkDNSDesc"),
    },
  ];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900/95 backdrop-blur-md border-2 border-red-600/40 text-white shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }} className="relative">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-red-400" />
              </div>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-gray-900" />
            </motion.div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-minecraft text-red-400 flex items-center gap-2">{t("connectionError")}</DialogTitle>
              <DialogDescription className="text-gray-300 mt-1">{t("serverUnavailableDesc")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-400 mb-1">{t("cannotConnectToServer")}</h4>
                <p className="text-sm text-gray-300">{t("cannotConnectToServerDesc")}</p>
              </div>
            </div>
          </motion.div>

          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-3 font-minecraft">{t("troubleshootingSteps")}</h4>
            <div className="space-y-3">
              {troubleshootingSteps.map((step, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.1 }} className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-3 hover:border-emerald-600/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold text-gray-200">{step.title}</h5>
                      <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Image src="/images/command-block.webp" alt="Help" width={32} height={32} className="object-contain" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-400">{t("needMoreHelp")}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{t("needMoreHelpDesc")}</p>
              </div>
              <Button onClick={() => window.open(LINK_DOCUMENTATION, "_blank")} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-600/20">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>

        <DialogFooter>
          <Button onClick={handleRetry} disabled={isRetrying} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t("retrying")}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("retryConnection")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
