"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Download, Calendar, ExternalLink, Star, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurseForgeModpack, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { FC } from "react";

interface ModpackCardProps {
  readonly modpack: CurseForgeModpack;
  readonly onSelect?: (modpack: CurseForgeModpack) => void;
}

export const ModpackCard: FC<ModpackCardProps> = ({ modpack, onSelect }) => {
  const { t } = useLanguage();

  const getLatestVersion = () => {
    return modpack.latestFiles?.[0]?.gameVersions?.[0] || "N/A";
  };

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(modpack.links.websiteUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="h-full">
      <Card className="group relative h-full overflow-hidden border border-gray-700 bg-gray-900 transition-all hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/20">
        <div className="relative h-40 w-full overflow-hidden bg-gray-800">
          {modpack.logo?.url ? (
            <Image src={modpack.logo.url} alt={modpack.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="400px" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-800">
              <Image src="/images/grass.webp" alt="Default" width={64} height={64} className="opacity-30" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />

          {modpack.isFeatured && (
            <Badge className="absolute right-2 top-2 border-0 bg-yellow-500 text-xs font-bold text-black">
              <Star className="mr-1 h-3 w-3 fill-black" />
              {t("featured")}
            </Badge>
          )}

          <Badge className="absolute bottom-2 left-2 border-0 bg-emerald-500/90 text-xs font-semibold text-white">
            <Download className="mr-1 h-3 w-3" />
            {formatDownloadCount(modpack.downloadCount)}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <h3 className="line-clamp-2 min-h-[2.5rem] font-minecraft text-base font-bold leading-tight text-white group-hover:text-emerald-400">{modpack.name}</h3>

          <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-gray-400">{modpack.summary}</p>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{getLatestVersion()}</span>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => onSelect?.(modpack)} size="sm" className="flex-1 bg-emerald-600 font-minecraft text-xs hover:bg-emerald-500">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {t("selectModpack")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExternalLink} className="border-gray-700 text-gray-300 hover:border-emerald-500 hover:bg-gray-800 hover:text-emerald-400">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
