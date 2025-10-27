"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Download, Users, Calendar, ExternalLink, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurseForgeModpack, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ModpackCardProps {
  modpack: CurseForgeModpack;
  onSelect?: (modpack: CurseForgeModpack) => void;
}

export function ModpackCard({ modpack, onSelect }: ModpackCardProps) {
  const { t } = useLanguage();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getLatestVersion = () => {
    if (modpack.latestFiles && modpack.latestFiles.length > 0) {
      const latestFile = modpack.latestFiles[0];
      if (latestFile.gameVersions && latestFile.gameVersions.length > 0) {
        return latestFile.gameVersions[0];
      }
    }
    return "Unknown";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="h-full border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md hover:border-emerald-600/40 hover:shadow-lg hover:shadow-emerald-600/10 transition-all duration-300 overflow-hidden group">
        <div className="relative h-48 w-full overflow-hidden bg-gray-800">
          {modpack.logo?.url ? (
            <Image
              src={modpack.logo.url}
              alt={modpack.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image src="/images/grass.webp" alt="Default" width={64} height={64} className="opacity-50" />
            </div>
          )}
          {modpack.isFeatured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-yellow-500/90 text-yellow-900 border-yellow-600">
                <Star className="w-3 h-3 mr-1" />
                {t("featured")}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-minecraft line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {modpack.name}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-3 min-h-[60px]">{modpack.summary}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {modpack.authors.slice(0, 2).map((author) => (
              <Badge key={author.id} variant="outline" className="text-xs border-gray-600 text-gray-300">
                <Users className="w-3 h-3 mr-1" />
                {author.name}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3 text-emerald-400" />
              <span>{formatDownloadCount(modpack.downloadCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              <span>{getLatestVersion()}</span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {t("updated")}: {formatDate(modpack.dateModified)}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onSelect?.(modpack)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft text-sm"
            >
              {t("selectModpack")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(modpack.links.websiteUrl, "_blank")}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-emerald-400"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

