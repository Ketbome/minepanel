"use client";

import { ChangeEvent, FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FileArchive, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { modpacksService, ModpackFile, ModpackInspection, ModpackKind } from "@/services/modpacks/modpacks.service";
import { TranslationKey } from "@/lib/translations";

export const MODPACK_KIND_LABEL: Record<ModpackKind, TranslationKey> = {
  "curseforge-client": "modpackKindClient",
  modrinth: "modpackKindModrinth",
  "server-pack": "modpackKindServerPack",
  generic: "modpackKindGeneric",
};

interface ModpackFilePickerProps {
  readonly serverId: string;
  readonly value?: string;
  readonly onChange: (containerPath: string) => void;
  /** Reports what the selected archive declares, so the caller can adjust the server config. */
  readonly onInspection?: (inspection: ModpackInspection | null) => void;
  /** Comma separated extensions, e.g. ".zip" or ".mrpack" */
  readonly accept: string;
  readonly disabled?: boolean;
}

const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const ModpackFilePicker: FC<ModpackFilePickerProps> = ({ serverId, value, onChange, onInspection, accept, disabled }) => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ModpackFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [inspection, setInspection] = useState<ModpackInspection | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const matchesAccept = useCallback(
    (name: string) =>
      accept
        .split(",")
        .map((extension) => extension.trim().toLowerCase())
        .some((extension) => name.toLowerCase().endsWith(extension)),
    [accept],
  );

  // Responses that land after the picker moved to another server must be dropped.
  const activeServerRef = useRef(serverId);
  activeServerRef.current = serverId;

  // Kept in a ref so an inline callback from the parent cannot restart the effect.
  const onInspectionRef = useRef(onInspection);
  onInspectionRef.current = onInspection;

  const load = useCallback(async () => {
    try {
      const all = await modpacksService.list(serverId);
      if (activeServerRef.current !== serverId) return;
      setFiles(all.filter((file) => matchesAccept(file.name)));
    } catch {
      if (activeServerRef.current === serverId) mcToast.error(t("modpackLoadError"));
    } finally {
      if (activeServerRef.current === serverId) setIsLoading(false);
    }
  }, [serverId, matchesAccept, t]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedName = useMemo(() => files.find((file) => file.containerPath === value)?.name, [files, value]);

  // Reading an archive means loading it whole, so only the selected one is inspected.
  useEffect(() => {
    // The previous file's inspection has to go before the next one is read: the
    // caller acts on it, and acting on the old archive under the new path is
    // worse than having nothing to act on.
    setInspection(null);
    onInspectionRef.current?.(null);

    if (!selectedName) return;

    let cancelled = false;
    setIsInspecting(true);
    modpacksService
      .inspect(serverId, selectedName)
      .then((result) => {
        if (cancelled) return;
        setInspection(result);
        onInspectionRef.current?.(result);
      })
      .catch(() => {
        if (cancelled) return;
        setInspection(null);
        onInspectionRef.current?.(null);
      })
      .finally(() => {
        if (!cancelled) setIsInspecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [serverId, selectedName]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    // accept= is only a hint in the file dialog, and the backend takes both formats.
    if (!matchesAccept(file.name)) {
      mcToast.error(`${t("modpackWrongFormat")} ${accept}`);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await modpacksService.upload(serverId, file);
      mcToast.success(t("modpackUploaded"));
      onChange(uploaded.containerPath);
      await load();
    } catch {
      mcToast.error(t("modpackUploadError"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async (file: ModpackFile) => {
    try {
      await modpacksService.remove(serverId, file.name);
      if (value === file.containerPath) onChange("");
      mcToast.success(t("modpackDeleted"));
      await load();
    } catch {
      mcToast.error(t("modpackDeleteError"));
    }
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      )}

      {!isLoading && files.length === 0 && <p className="text-xs text-gray-400">{t("modpackEmpty")}</p>}

      {!isLoading && files.length > 0 && (
        <p className="font-minecraft text-[11px] uppercase tracking-wide text-gray-500">
          {t("modpackCount").replace("{count}", String(files.length))} · {formatSize(totalSize)}
        </p>
      )}

      {files.map((file) => {
        const isSelected = value === file.containerPath;
        return (
          <div
            key={file.name}
            className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${isSelected ? "border-emerald-500/50 bg-emerald-600/10" : "border-gray-700/50 bg-gray-900/40"}`}
          >
            <button type="button" onClick={() => onChange(file.containerPath)} disabled={disabled} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <FileArchive className={`h-4 w-4 shrink-0 ${isSelected ? "text-emerald-400" : "text-gray-400"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-100">{file.name}</span>
                <span className="block text-xs text-gray-500">
                  {formatSize(file.size)} · {file.containerPath}
                </span>
                {isSelected && isInspecting && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("modpackInspecting")}
                  </span>
                )}
                {isSelected && !isInspecting && inspection && (
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="border border-gray-600/60 bg-gray-800/70 px-1.5 py-0.5 font-minecraft text-[10px] uppercase text-gray-300">{t(MODPACK_KIND_LABEL[inspection.kind])}</span>
                    {inspection.loader && (
                      <span className="border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-minecraft text-[10px] uppercase text-emerald-300">
                        {inspection.loader}
                        {inspection.loaderVersion ? ` ${inspection.loaderVersion}` : ""}
                      </span>
                    )}
                    {inspection.minecraftVersion && (
                      <span className="border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 font-minecraft text-[10px] uppercase text-sky-300">MC {inspection.minecraftVersion}</span>
                    )}
                    {inspection.needsLoader && (
                      <span className="flex items-center gap-1 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-minecraft text-[10px] uppercase text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        {t("modpackNoLoader")}
                      </span>
                    )}
                  </span>
                )}
              </span>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
            </button>
            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(file)} disabled={disabled} className="h-8 w-8 text-gray-400 hover:bg-red-600/20 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="minepanelOutline" onClick={() => inputRef.current?.click()} disabled={disabled || isUploading} className="w-full font-minecraft">
        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {isUploading ? t("uploading") : t("modpackUpload")}
      </Button>

      <p className="text-xs text-gray-400">{t("modpackHint")}</p>
    </div>
  );
};
