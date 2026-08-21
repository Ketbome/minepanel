"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurseForgeFile, CurseForgeModpack, formatDownloadCount } from "@/services/curseforge/curseforge.service";
import { AlertTriangle, Calendar, Check, Copy, Download, ExternalLink, HardDrive, Heart, Package, Rocket, Server, Tag, Trophy, Users } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { FC, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { createServer } from "@/services/docker/fetchs";
import { findMinecraftVersion, getSuggestedJavaImage } from "@/lib/utils/java-image";

interface ModpackDetailsModalEnhancedProps {
  readonly modpack: CurseForgeModpack | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

// CurseForge mixes Minecraft versions and loader names in the same list.
const MC_VERSION = /^\d+\.\d+(\.\d+)?$/;

const RELEASE_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: "Release", className: "bg-emerald-600 text-white" },
  2: { label: "Beta", className: "bg-yellow-600 text-black" },
  3: { label: "Alpha", className: "bg-red-600 text-white" },
};

const splitGameVersions = (gameVersions: string[] = []) => ({
  minecraft: gameVersions.filter((version) => MC_VERSION.test(version.trim())),
  loaders: gameVersions.filter((version) => !MC_VERSION.test(version.trim())),
});

const formatSize = (bytes?: number): string | null => {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
};

const formatDate = (value?: string): string => (value ? new Date(value).toLocaleDateString() : "-");

export function ModpackDetailsModalEnhanced({ modpack, open, onClose }: ModpackDetailsModalEnhancedProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [serverId, setServerId] = useState("");
  const [serverName, setServerName] = useState("");
  const [installMethod, setInstallMethod] = useState<"url" | "slug">("url");
  const [fileId, setFileId] = useState("");

  // The modal stays mounted between modpacks, so without this the next one opens
  // holding the previous pack's file and server id.
  useEffect(() => {
    setServerId("");
    setServerName("");
    setFileId("");
    setInstallMethod("url");
  }, [modpack?.id]);

  if (!modpack) return null;

  const files = modpack.latestFiles ?? [];
  const latestFile: CurseForgeFile | undefined = files[0];
  const selectedFile = files.find((file) => String(file.id) === fileId) ?? latestFile;
  const detectedVersion = findMinecraftVersion(selectedFile?.gameVersions);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    mcToast.success(`${label} ${t("copiedToClipboard")}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateServer = async () => {
    if (!serverId.trim()) {
      mcToast.error(t("serverIdRequired"));
      return;
    }

    setIsCreating(true);
    try {
      // Pinned to a file so the pack does not move on its own, and the Minecraft
      // version comes from that same file.
      const config = {
        id: serverId,
        serverName: serverName || modpack.name,
        serverType: "AUTO_CURSEFORGE" as const,
        cfMethod: installMethod,
        cfUrl: installMethod === "url" ? (selectedFile ? `${modpack.links.websiteUrl}/download/${selectedFile.id}` : modpack.links.websiteUrl) : "",
        cfSlug: installMethod === "slug" ? modpack.slug : "",
        cfFile: installMethod === "slug" && selectedFile ? String(selectedFile.id) : "",
        ...(detectedVersion ? { minecraftVersion: detectedVersion, dockerImage: getSuggestedJavaImage(detectedVersion) } : {}),
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
      <DialogContent className="max-h-[90vh] w-[min(96vw,88rem)] overflow-y-auto border-2 border-gray-700 bg-gray-900 p-0 text-white sm:max-w-none scrollbar-hide">
        <div className="sticky top-0 z-10 border-b-2 border-gray-700 bg-gray-900/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <ModpackLogo modpack={modpack} />
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-minecraft text-xl leading-tight font-bold text-white">{modpack.name}</DialogTitle>
              <DialogDescription className="mt-1 max-w-4xl text-sm text-gray-400">{modpack.summary}</DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {modpack.isFeatured ? <span className="mc-tag bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black">{t("featured")}</span> : null}
                {modpack.categories?.slice(0, 8).map((category) => (
                  <span key={category.id} className="mc-tag bg-[var(--mc-stone-deep)] px-1.5 py-0.5 text-[10px] text-gray-300">
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="mx-6 mt-4 grid w-full max-w-lg grid-cols-2 bg-gray-800">
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile icon={<Download className="h-4 w-4" />} label={t("downloads")} value={formatDownloadCount(modpack.downloadCount)} tone="text-emerald-400 border-emerald-600/30 bg-emerald-600/10" />
              <StatTile icon={<Heart className="h-4 w-4" />} label={t("modpackLikes")} value={formatDownloadCount(modpack.thumbsUpCount ?? 0)} tone="text-red-400 border-red-600/30 bg-red-600/10" />
              <StatTile icon={<Trophy className="h-4 w-4" />} label={t("popularity")} value={modpack.gamePopularityRank ? `#${modpack.gamePopularityRank}` : "-"} tone="text-yellow-400 border-yellow-600/30 bg-yellow-600/10" />
              <StatTile icon={<Calendar className="h-4 w-4" />} label={t("updated")} value={formatDate(modpack.dateModified)} tone="text-purple-400 border-purple-600/30 bg-purple-600/10" />
              <StatTile icon={<Calendar className="h-4 w-4" />} label={t("created")} value={formatDate(modpack.dateCreated)} tone="text-blue-400 border-blue-600/30 bg-blue-600/10" />
            </div>

            {/* itzg cannot download a pack whose author opted out of the API, so
                the install would fail halfway through provisioning. */}
            {modpack.allowModDistribution === false ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-600/40 bg-amber-900/20 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-200">{t("modpackNoDistribution")}</p>
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Gallery modpack={modpack} />

                <div>
                  <SectionTitle icon={<Users className="h-4 w-4 text-blue-400" />} label={t("authors")} />
                  <div className="flex flex-wrap gap-1.5">
                    {modpack.authors?.map((author) => (
                      <a key={author.id} href={author.url} target="_blank" rel="noopener noreferrer" className="mc-tag bg-blue-600/20 px-2 py-0.5 text-[11px] text-blue-300 transition-colors hover:bg-blue-600/40 hover:text-blue-100">
                        {author.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {latestFile ? <FileCard file={latestFile} title={t("latestVersion")} /> : null}
                <SupportedVersions modpack={modpack} />
              </div>
            </div>

            <div className="flex gap-2 border-t border-gray-700 pt-4">
              <Button onClick={() => window.open(modpack.links.websiteUrl, "_blank")} className="flex-1 bg-blue-600 font-minecraft hover:bg-blue-700">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("viewOnCurseForge")}
              </Button>
              <Button onClick={onClose} variant="outline" className="border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-700 hover:text-white">
                {t("close")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="mt-4 px-6 pb-6">
            <div className="space-y-4 rounded-lg border border-emerald-600/40 bg-emerald-900/10 p-5">
              <div>
                <h3 className="font-minecraft text-lg font-bold text-emerald-400">{t("createServer")}</h3>
                <p className="text-sm text-gray-400">{t("createServerFromModpack")}</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-white">
                      {t("serverId")} <span className="text-red-400">*</span>
                    </Label>
                    <Input value={serverId} onChange={(e) => setServerId(e.target.value.toLowerCase().replaceAll(/[^a-z0-9-_]/g, ""))} placeholder="my-modpack-server" className="mt-1 border-gray-700 bg-gray-800 text-white" />
                    <p className="mt-1 text-xs text-gray-500">{t("serverIdDescription")}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-white">{t("serverName")}</Label>
                    <Input value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder={modpack.name} className="mt-1 border-gray-700 bg-gray-800 text-white" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-white">{t("modpackVersionToInstall")}</Label>
                    {files.length > 0 ? (
                      <select value={fileId} onChange={(e) => setFileId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        <option value="">{`${t("latestVersion")} (${latestFile?.displayName ?? ""})`}</option>
                        {files.map((file) => (
                          <option key={file.id} value={file.id}>
                            {`${file.displayName} · ${findMinecraftVersion(file.gameVersions) ?? "?"}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input value={fileId} onChange={(e) => setFileId(e.target.value)} placeholder={t("fileId")} className="mt-1 border-gray-700 bg-gray-800 text-white" />
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-white">{t("installationMethod")}</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {(["url", "slug"] as const).map((method) => (
                        <Button
                          key={method}
                          type="button"
                          size="sm"
                          variant={installMethod === method ? "default" : "outline"}
                          onClick={() => setInstallMethod(method)}
                          className={installMethod === method ? "bg-emerald-600 hover:bg-emerald-500" : "border-gray-700 bg-gray-800 text-gray-300 hover:border-emerald-500 hover:bg-gray-700 hover:text-emerald-400"}
                        >
                          {method === "url" ? "URL" : "Slug"}
                        </Button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{t("modpackInstallMethodHelp")}</p>
                  </div>

                  <div className="flex gap-2">
                    <Input value={installMethod === "url" ? modpack.links.websiteUrl : modpack.slug} readOnly className="border-gray-700 bg-gray-800 text-xs text-gray-400" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(installMethod === "url" ? modpack.links.websiteUrl : modpack.slug, installMethod === "url" ? "URL" : "Slug")} className="border-emerald-600 text-emerald-400 hover:border-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-300">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* What the form is actually about to write, since the version and
                    the Java image are picked from the file, not typed by hand. */}
                <div className="h-fit rounded-lg border border-gray-700 bg-gray-800/40 p-3 md:col-span-2 xl:col-span-1">
                  <p className="mb-2 font-minecraft text-[11px] tracking-wide text-emerald-300">{t("modpackWillCreate")}</p>
                  <dl className="grid gap-1 text-xs">
                    <SummaryRow label={t("serverType")} value="AUTO_CURSEFORGE" />
                    <SummaryRow label={t("fileName")} value={selectedFile?.fileName ?? "-"} />
                    <SummaryRow label={t("minecraftVersion")} value={detectedVersion ?? "-"} />
                    <SummaryRow label={t("dockerImage")} value={detectedVersion ? `itzg/minecraft-server:${getSuggestedJavaImage(detectedVersion)}` : "-"} />
                  </dl>
                </div>
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

const StatTile: FC<{ readonly icon: React.ReactNode; readonly label: string; readonly value: string; readonly tone: string }> = ({ icon, label, value, tone }) => (
  <div className={`rounded-lg border p-3 ${tone}`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </div>
    <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
  </div>
);

const SectionTitle: FC<{ readonly icon: React.ReactNode; readonly label: string }> = ({ icon, label }) => (
  <h3 className="mb-2 flex items-center gap-2 font-minecraft text-sm font-bold text-white">
    {icon}
    {label}
  </h3>
);

const SummaryRow: FC<{ readonly label: string; readonly value: string }> = ({ label, value }) => (
  <div className="flex min-w-0 gap-2">
    <dt className="shrink-0 text-gray-500">{label}:</dt>
    <dd className="min-w-0 truncate text-gray-200">{value}</dd>
  </div>
);

// CurseForge artwork is served from its own CDN; going through the Next image
// optimizer means the panel's own container has to reach it, which a locked-down
// deployment does not.
const ModpackLogo: FC<{ readonly modpack: CurseForgeModpack }> = ({ modpack }) => {
  const [failed, setFailed] = useState(false);

  if (!modpack.logo?.url || failed) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-[var(--mc-frame)] bg-[var(--mc-stone-deep)]">
        <Image src="/images/grass.webp" alt="" width={32} height={32} className="pixelated opacity-40" />
      </div>
    );
  }

  return <Image unoptimized src={modpack.logo.url} alt={modpack.name} width={64} height={64} onError={() => setFailed(true)} className="h-16 w-16 shrink-0 border-2 border-[var(--mc-frame)] object-cover" />;
};

const Gallery: FC<{ readonly modpack: CurseForgeModpack }> = ({ modpack }) => {
  const [active, setActive] = useState(0);
  const screenshots = modpack.screenshots ?? [];

  useEffect(() => setActive(0), [modpack.id]);

  if (screenshots.length === 0) return null;
  const current = screenshots[Math.min(active, screenshots.length - 1)];

  return (
    <div>
      <SectionTitle icon={<Package className="h-4 w-4 text-emerald-400" />} label="Screenshots" />
      <div className="relative aspect-video max-h-[420px] w-full overflow-hidden rounded border-2 border-gray-700 bg-gray-800">
        <Image unoptimized src={current.url} alt={current.title} fill sizes="(max-width: 1024px) 90vw, 60vw" className="object-cover" />
      </div>
      {screenshots.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {screenshots.map((screenshot, index) => (
            <button
              key={screenshot.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={screenshot.title}
              className={`relative h-12 w-20 shrink-0 overflow-hidden rounded border-2 transition-colors ${index === active ? "border-emerald-500" : "border-gray-700 hover:border-gray-500"}`}
            >
              <Image unoptimized src={screenshot.thumbnailUrl || screenshot.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const FileCard: FC<{ readonly file: CurseForgeFile; readonly title: string }> = ({ file, title }) => {
  const { t } = useLanguage();
  const { minecraft, loaders } = splitGameVersions(file.gameVersions);
  const release = RELEASE_LABELS[file.releaseType];
  const size = formatSize(file.fileLength);

  return (
    <div>
      <SectionTitle icon={<Tag className="h-4 w-4 text-emerald-400" />} label={title} />
      <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-800/40 p-3 text-sm">
        <div className="flex items-center gap-2">
          {release ? <span className={`mc-tag px-1.5 py-0.5 text-[10px] font-bold ${release.className}`}>{release.label}</span> : null}
          {file.isServerPack ? (
            <span className="mc-tag flex items-center bg-[var(--mc-stone-deep)] px-1.5 py-0.5 text-[10px] text-emerald-300">
              <Server className="mr-1 h-3 w-3" />
              {t("modpackServerPack")}
            </span>
          ) : null}
        </div>

        <p className="break-all text-xs text-gray-300">{file.fileName}</p>

        <div className="flex flex-wrap gap-1">
          {minecraft.map((version) => (
            <span key={version} className="mc-tag bg-blue-600/20 px-1.5 py-0.5 text-[10px] text-blue-300">
              {version}
            </span>
          ))}
          {loaders.map((loader) => (
            <span key={loader} className="mc-tag bg-purple-600/20 px-1.5 py-0.5 text-[10px] text-purple-300">
              {loader}
            </span>
          ))}
        </div>

        <div className="space-y-1 border-t border-gray-700/60 pt-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">{t("releaseDate")}</span>
            <span className="text-gray-300">{formatDate(file.fileDate)}</span>
          </div>
          {size ? (
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-gray-500">
                <HardDrive className="h-3 w-3" />
                {t("modpackFileSize")}
              </span>
              <span className="text-gray-300">{size}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">{t("downloads")}</span>
            <span className="text-gray-300">{formatDownloadCount(file.downloadCount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Every Minecraft version the pack has a build for, taken from the file index
// rather than the newest file alone.
const SupportedVersions: FC<{ readonly modpack: CurseForgeModpack }> = ({ modpack }) => {
  const { t } = useLanguage();
  const versions = [...new Set((modpack.latestFilesIndexes ?? []).map((index) => index.gameVersion).filter(Boolean))];

  if (versions.length === 0) return null;

  return (
    <div>
      <SectionTitle icon={<Package className="h-4 w-4 text-blue-400" />} label={t("modpackSupportedVersions")} />
      <div className="flex flex-wrap gap-1">
        {versions.slice(0, 12).map((version) => (
          <span key={version} className="mc-tag bg-[var(--mc-stone-deep)] px-1.5 py-0.5 text-[10px] text-gray-300">
            {version}
          </span>
        ))}
        {versions.length > 12 ? <span className="mc-tag bg-[var(--mc-stone-deep)] px-1.5 py-0.5 text-[10px] text-gray-500">+{versions.length - 12}</span> : null}
      </div>
    </div>
  );
};
