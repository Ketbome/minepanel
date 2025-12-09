"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurseForgeModpack, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { Download, ExternalLink, Calendar, Users, Package, Copy, Check, Rocket, Globe } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { createServer } from "@/services/docker/fetchs";

interface ModpackDetailsModalEnhancedProps {
  readonly modpack: CurseForgeModpack | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function ModpackDetailsModalEnhanced({ modpack, open, onClose }: ModpackDetailsModalEnhancedProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [serverId, setServerId] = useState("");
  const [serverName, setServerName] = useState("");
  const [installMethod, setInstallMethod] = useState<"url" | "slug">("url");
  const [fileId, setFileId] = useState("");

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
    mcToast.success(`${label} ${t("copiedToClipboard")}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateServer = async () => {
    if (!serverId.trim()) {
      mcToast.error(t("serverIdRequired") || "Server ID is required");
      return;
    }

    setIsCreating(true);
    try {
      const config = {
        id: serverId,
        serverName: serverName || modpack.name,
        serverType: "AUTO_CURSEFORGE" as const,
        cfMethod: installMethod,
        cfUrl: installMethod === "url" ? modpack.links.websiteUrl : "",
        cfSlug: installMethod === "slug" ? modpack.slug : "",
        cfFile: installMethod === "slug" && fileId ? fileId : "",
      };

      await createServer(config);
      mcToast.success(t("serverCreated"));
      onClose();
      router.push(`/dashboard/servers/${serverId}`);
    } catch (error) {
      console.error("Error creating server:", error);
      mcToast.error(t("errorCreatingServer"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1400px] max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700 text-white scrollbar-hide p-0">
        <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-4">
            {modpack.logo && <Image src={modpack.logo.url} alt={modpack.name} width={60} height={60} className="rounded-lg border border-gray-700" />}
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold font-minecraft text-white">{modpack.name}</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">{modpack.summary}</DialogDescription>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2 bg-gray-800">
            <TabsTrigger value="info" className="text-white data-[state=active]:bg-emerald-600">
              <Package className="mr-2 h-4 w-4" />
              {t("modpackDetails")}
            </TabsTrigger>
            <TabsTrigger value="create" className="text-white data-[state=active]:bg-blue-600">
              <Rocket className="mr-2 h-4 w-4" />
              {t("createServer")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4 space-y-4 px-6 pb-6">
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-emerald-600/30 bg-emerald-600/10 p-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Download className="h-4 w-4" />
                  <span className="text-xs font-semibold">{t("downloads")}</span>
                </div>
                <p className="mt-1 font-bold text-white">{formatDownloadCount(modpack.downloadCount)}</p>
              </div>

              <div className="rounded-lg border border-blue-600/30 bg-blue-600/10 p-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold">{t("created")}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-white">{formatDate(modpack.dateCreated)}</p>
              </div>

              <div className="rounded-lg border border-purple-600/30 bg-purple-600/10 p-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold">{t("updated")}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-white">{formatDate(modpack.dateModified)}</p>
              </div>

              <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-3">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Package className="h-4 w-4" />
                  <span className="text-xs font-semibold">{t("files")}</span>
                </div>
                <p className="mt-1 font-bold text-white">{modpack.latestFiles?.length || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {modpack.screenshots && modpack.screenshots.length > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-minecraft text-sm font-bold text-white">
                      <Globe className="h-4 w-4 text-emerald-400" />
                      Screenshots
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {modpack.screenshots.slice(0, 4).map((screenshot) => (
                        <div key={screenshot.id} className="relative h-24 overflow-hidden rounded border border-gray-700">
                          <Image src={screenshot.url} alt={screenshot.title} fill className="object-cover" sizes="200px" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-minecraft text-sm font-bold text-white">
                    <Users className="h-4 w-4 text-blue-400" />
                    {t("authors")}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {modpack.authors.map((author) => (
                      <Badge key={author.id} className="border-blue-500/30 bg-blue-500/20 text-xs text-blue-300">
                        {author.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {latestFile && (
                  <div>
                    <h3 className="mb-2 font-minecraft text-sm font-bold text-white">{t("latestVersion")}</h3>
                    <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-800/40 p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t("fileName")}:</span>
                        <span className="text-white">{latestFile.fileName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t("gameVersions")}:</span>
                        <div className="flex flex-wrap gap-1">
                          {latestFile.gameVersions.slice(0, 3).map((version) => (
                            <Badge key={version} className="border-blue-600/30 bg-blue-600/20 text-xs text-blue-400">
                              {version}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t("releaseDate")}:</span>
                        <span className="text-white">{formatDate(latestFile.fileDate)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-gray-700 pt-4">
              <Button onClick={() => window.open(modpack.links.websiteUrl, "_blank")} className="flex-1 bg-blue-600 font-minecraft hover:bg-blue-700">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("viewOnCurseForge")}
              </Button>
              <Button onClick={onClose} variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-600">
                {t("close")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="mt-4 px-6 pb-6">
            <div className="space-y-4 rounded-lg border border-emerald-600/40 bg-emerald-900/10 p-6">
              <div>
                <h3 className="font-minecraft text-xl font-bold text-emerald-400">{t("createServer")}</h3>
                <p className="text-sm text-gray-400">{t("createServerFromModpack") || "Create a new server using this modpack"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-white">
                      {t("serverId")} <span className="text-red-400">*</span>
                    </Label>
                    <Input value={serverId} onChange={(e) => setServerId(e.target.value.toLowerCase().replaceAll(/[^a-z0-9-_]/g, ""))} placeholder="my-modpack-server" className="mt-1 bg-gray-800 border-gray-700 text-white" />
                    <p className="mt-1 text-xs text-gray-500">{t("serverIdDescription")}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-white">{t("serverName")}</Label>
                    <Input value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder={modpack.name} className="mt-1 bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-white">{t("installationMethod")}</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <Button type="button" size="sm" variant={installMethod === "url" ? "default" : "outline"} onClick={() => setInstallMethod("url")} className={installMethod === "url" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-emerald-400 hover:border-emerald-500"}>
                        URL
                      </Button>
                      <Button type="button" size="sm" variant={installMethod === "slug" ? "default" : "outline"} onClick={() => setInstallMethod("slug")} className={installMethod === "slug" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-emerald-400 hover:border-emerald-500"}>
                        Slug
                      </Button>
                    </div>
                  </div>

                  {installMethod === "url" ? (
                    <div>
                      <Label className="text-sm font-semibold text-white">{t("modpackUrl")}</Label>
                      <div className="mt-1 flex gap-2">
                        <Input value={modpack.links.websiteUrl} readOnly className="bg-gray-800 border-gray-700 text-white" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(modpack.links.websiteUrl, "URL")} className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500">
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-semibold text-white">{t("modpackSlug")}</Label>
                        <div className="mt-1 flex gap-2">
                          <Input value={modpack.slug} readOnly className="bg-gray-800 border-gray-700 text-white" />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(modpack.slug, "Slug")} className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-white">
                          {t("fileId")} <span className="text-xs text-gray-500">({t("optional")})</span>
                        </Label>
                        {modpack.latestFiles && modpack.latestFiles.length > 0 ? (
                          <select value={fileId} onChange={(e) => setFileId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="">{t("latestVersion")} (Auto)</option>
                            {modpack.latestFiles.slice(0, 10).map((file) => (
                              <option key={file.id} value={file.id}>
                                {file.displayName} - {file.gameVersions[0] || "Unknown"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input value={fileId} onChange={(e) => setFileId(e.target.value)} placeholder={latestFile?.id.toString() || ""} className="mt-1 bg-gray-800 border-gray-700 text-white" />
                        )}
                        <p className="mt-1 text-xs text-gray-500">{t("fileIdDesc")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-blue-600/30 bg-blue-900/20 p-3">
                <p className="text-sm text-blue-300">{t("cfApiKeyRequired")}</p>
              </div>

              <Button onClick={handleCreateServer} disabled={isCreating || !serverId.trim()} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 font-minecraft hover:from-emerald-500 hover:to-emerald-600">
                <Rocket className="mr-2 h-4 w-4" />
                {isCreating ? t("creating") : t("createServer")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
