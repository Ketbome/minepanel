"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurseForgeModpack, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { Download, ExternalLink, Calendar, Users, Package, Copy, Check } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ModpackDetailsModalProps {
  modpack: CurseForgeModpack | null;
  open: boolean;
  onClose: () => void;
}

export function ModpackDetailsModal({ modpack, open, onClose }: ModpackDetailsModalProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!modpack) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getLatestFile = () => {
    if (modpack.latestFiles && modpack.latestFiles.length > 0) {
      return modpack.latestFiles[0];
    }
    return null;
  };

  const latestFile = getLatestFile();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} ${t("copiedToClipboard")}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-2 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-minecraft text-white">{modpack.name}</DialogTitle>
          <DialogDescription className="text-gray-400">{t("modpackDetails")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modpack.logo && (
              <div className="relative h-48 rounded-lg overflow-hidden border-2 border-gray-700">
                <Image src={modpack.logo.url} alt={modpack.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
            )}
            {modpack.screenshots && modpack.screenshots.length > 0 && (
              <div className="relative h-48 rounded-lg overflow-hidden border-2 border-gray-700">
                <Image
                  src={modpack.screenshots[0].url}
                  alt="Screenshot"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-2 font-minecraft">{t("description")}</h3>
            <p className="text-gray-300">{modpack.summary}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Download className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">{t("downloads")}</span>
              </div>
              <p className="text-xl font-bold">{formatDownloadCount(modpack.downloadCount)}</p>
            </div>

            <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">{t("created")}</span>
              </div>
              <p className="text-sm font-bold">{formatDate(modpack.dateCreated)}</p>
            </div>

            <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">{t("updated")}</span>
              </div>
              <p className="text-sm font-bold">{formatDate(modpack.dateModified)}</p>
            </div>

            <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 text-yellow-400 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">{t("files")}</span>
              </div>
              <p className="text-xl font-bold">{modpack.latestFiles?.length || 0}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2 font-minecraft flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("authors")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {modpack.authors.map((author) => (
                <Badge key={author.id} variant="outline" className="border-gray-600 text-gray-300">
                  {author.name}
                </Badge>
              ))}
            </div>
          </div>

          {latestFile && (
            <div>
              <h3 className="text-lg font-bold mb-2 font-minecraft">{t("latestVersion")}</h3>
              <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{t("fileName")}:</span>
                  <span className="text-white font-medium">{latestFile.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{t("gameVersions")}:</span>
                  <div className="flex gap-1 flex-wrap">
                    {latestFile.gameVersions.slice(0, 3).map((version) => (
                      <Badge key={version} className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                        {version}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{t("releaseDate")}:</span>
                  <span className="text-white">{formatDate(latestFile.fileDate)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-emerald-900/20 border-2 border-emerald-600/40 rounded-lg p-4 space-y-3">
            <h3 className="text-lg font-bold font-minecraft text-emerald-400">{t("quickCopy")}</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-300 text-sm mb-1">{t("modpackId")}</Label>
                <div className="flex gap-2">
                  <Input value={modpack.id.toString()} readOnly className="bg-gray-800 border-gray-700 text-white" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(modpack.id.toString(), t("modpackId"))}
                    className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-sm mb-1">{t("modpackSlug")}</Label>
                <div className="flex gap-2">
                  <Input value={modpack.slug} readOnly className="bg-gray-800 border-gray-700 text-white" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(modpack.slug, t("modpackSlug"))}
                    className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-sm mb-1">{t("curseforgeUrl")}</Label>
                <div className="flex gap-2">
                  <Input value={modpack.links.websiteUrl} readOnly className="bg-gray-800 border-gray-700 text-white" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(modpack.links.websiteUrl, t("curseforgeUrl"))}
                    className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => window.open(modpack.links.websiteUrl, "_blank")}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-minecraft"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t("viewOnCurseForge")}
            </Button>
            <Button onClick={onClose} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              {t("close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

