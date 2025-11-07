"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Globe, Wifi, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import { getAllIPs } from "@/services/network.service";
import { LINK_LEARN_HOW_LAN } from "@/lib/providers/constants";

interface ServerConnectionInfoProps {
  readonly port: string;
  readonly serverId: string;
}

export function ServerConnectionInfo({ port, serverId }: ServerConnectionInfoProps) {
  const { t } = useLanguage();
  const [copiedGlobal, setCopiedGlobal] = useState(false);
  const [copiedLAN, setCopiedLAN] = useState(false);
  const [publicIP, setPublicIP] = useState<string | null>(null);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIPs = async () => {
      try {
        const { publicIP: fetchedPublicIP, localIPs: fetchedLocalIPs } = await getAllIPs();
        setPublicIP(fetchedPublicIP);
        setLocalIPs(fetchedLocalIPs);
      } catch (error) {
        console.error("Error fetching IPs:", error);
        toast.error(t("error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchIPs();
  }, [t]);

  const copyToClipboard = async (text: string, type: "global" | "lan") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "global") {
        setCopiedGlobal(true);
        setTimeout(() => setCopiedGlobal(false), 2000);
      } else {
        setCopiedLAN(true);
        setTimeout(() => setCopiedLAN(false), 2000);
      }
      toast.success(t("copiedToClipboard"));
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast.error(t("copyError"));
    }
  };

  const displayPublicIP = publicIP || (localIPs.length > 0 ? localIPs[0] : "localhost");
  const globalAddress = `${displayPublicIP}:${port}`;

  const lanAddress = localIPs.length > 0 ? `${localIPs[0]}:${port}` : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 backdrop-blur-sm rounded-lg border-2 border-emerald-600/30 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Image src="/images/compass.webp" alt="Connection" width={24} height={24} />
        <h3 className="text-sm font-minecraft text-emerald-400 uppercase tracking-wide">{t("serverConnection")}</h3>
        {isLoading && <Loader2 className="h-4 w-4 text-emerald-400 animate-spin ml-auto" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-gray-400 font-medium">{t("globalIP")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-900/80 rounded-md px-3 py-2 border border-gray-700/50 font-mono text-sm text-white flex items-center justify-between group hover:border-emerald-600/50 transition-colors">
                <span className="select-all">{globalAddress}</span>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(globalAddress, "global")} className="h-7 w-7 p-0 hover:bg-emerald-600/20 hover:text-emerald-400">
                    <AnimatePresence mode="wait">
                      {copiedGlobal ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="h-4 w-4 text-emerald-400" />
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Copy className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

          {/* IP LAN */}
          {lanAddress && lanAddress !== globalAddress && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-gray-400 font-medium">{t("lanIP")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-900/80 rounded-md px-3 py-2 border border-gray-700/50 font-mono text-sm text-white flex items-center justify-between group hover:border-blue-600/50 transition-colors">
                  <span className="select-all">{lanAddress}</span>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(lanAddress, "lan")} className="h-7 w-7 p-0 hover:bg-blue-600/20 hover:text-blue-400">
                      <AnimatePresence mode="wait">
                        {copiedLAN ? (
                          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Check className="h-4 w-4 text-blue-400" />
                          </motion.div>
                        ) : (
                          <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Copy className="h-4 w-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-emerald-600/20 space-y-2">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="text-emerald-400">💡</span>
              {t("connectionTip")}
            </p>
            {!lanAddress && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="text-blue-400">🏠</span>
                {t("playingLAN")}{" "}
                <a href={LINK_LEARN_HOW_LAN} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline transition-colors">
                  {t("learnHow")}
                </a>
              </p>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
