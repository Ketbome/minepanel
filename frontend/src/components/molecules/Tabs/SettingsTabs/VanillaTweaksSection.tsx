import { FC, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { isAxiosError } from "axios";
import { AlertTriangle, ExternalLink, Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ServerConfig } from "@/lib/types/types";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getVanillaTweaksShare, parseVanillaTweaksCode, vanillaTweaksVersion, VanillaTweaksShare } from "@/services/vanilla-tweaks.service";

interface VanillaTweaksSectionProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

const MAX_CODES = 10;
const SHOWN_PACKS = 12;

export const VanillaTweaksSection: FC<VanillaTweaksSectionProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const codes = useMemo(() => config.vanillaTweaksCodes ?? [], [config.vanillaTweaksCodes]);
  const [shares, setShares] = useState<Record<string, VanillaTweaksShare | "error">>({});
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serverVersion = vanillaTweaksVersion(config.minecraftVersion);
  const requested = useRef(new Set<string>());

  // Saved codes only store the code; fetch what each one installs to show it.
  useEffect(() => {
    for (const code of codes) {
      if (shares[code] || requested.current.has(code)) continue;
      requested.current.add(code);
      getVanillaTweaksShare(code)
        .then((share) => setShares((current) => ({ ...current, [code]: share })))
        .catch(() => setShares((current) => ({ ...current, [code]: "error" })));
    }
  }, [codes, shares]);

  const add = async () => {
    setError(null);
    const code = parseVanillaTweaksCode(input);
    if (!code) return setError(t("vtInvalidCode"));
    if (codes.includes(code)) return setError(t("vtDuplicate"));
    setAdding(true);
    try {
      const share = await getVanillaTweaksShare(code);
      if (share.type === "resourcepacks") return setError(t("vtResourcePack"));
      requested.current.add(code);
      setShares((current) => ({ ...current, [code]: share }));
      updateConfig("vanillaTweaksCodes", [...codes, code]);
      setInput("");
    } catch (err) {
      setError(isAxiosError(err) && err.response?.status === 404 ? t("vtNotFound") : t("vtUnreachable"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-gray-700/50 bg-gray-800/50 p-4">
      <div className="flex items-center gap-2">
        <Image src="/images/book.webp" alt="" width={16} height={16} />
        <span className="font-minecraft text-sm text-gray-200">Vanilla Tweaks</span>
        <a href="https://vanillatweaks.net/picker/datapacks/" target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
          vanillatweaks.net <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="text-xs text-gray-400">{t("vtDescription")}</p>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), add())}
          placeholder="https://vanillatweaks.net/share#MGr52E"
          aria-label={t("vtCodeLabel")}
          className="bg-gray-900/60 border-gray-700/50 font-mono text-sm"
          disabled={codes.length >= MAX_CODES}
        />
        <Button type="button" onClick={add} disabled={adding || !input.trim() || codes.length >= MAX_CODES} className="gap-1 bg-emerald-400 text-gray-950 hover:bg-emerald-300">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("vtAdd")}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {codes.map((code) => {
        const share = shares[code];
        const packs = share && share !== "error" ? Object.values(share.packs).flat() : [];
        const mismatch = share && share !== "error" && serverVersion && share.version !== serverVersion;
        return (
          <div key={code} className="space-y-1.5 rounded border border-gray-700/50 bg-gray-900/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono text-gray-100">{code}</span>
              {share && share !== "error" && (
                <span className="text-xs text-gray-400">
                  {t(share.type === "craftingtweaks" ? "vtTypeCrafting" : "vtTypeDatapacks")} · Minecraft {share.version} · {t("vtPackCount").replace("{count}", String(packs.length))}
                </span>
              )}
              {!share && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
              <button type="button" onClick={() => updateConfig("vanillaTweaksCodes", codes.filter((c) => c !== code))} className="mc-iconbtn ml-auto size-6" aria-label={`${t("vtRemove")} ${code}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {packs.length > 0 && (
              <p className="text-xs text-gray-300">
                {packs.slice(0, SHOWN_PACKS).join(", ")}
                {packs.length > SHOWN_PACKS && ` +${packs.length - SHOWN_PACKS}`}
              </p>
            )}
            {share === "error" && <p className="text-xs text-gray-500">{t("vtDetailsUnavailable")}</p>}
            {mismatch && (
              <p className="flex items-start gap-1.5 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("vtVersionMismatch").replace("{code}", share.version).replace("{server}", serverVersion)}
              </p>
            )}
          </div>
        );
      })}

      <p className="text-xs text-gray-500">{t("vtInstallNote")}</p>
    </div>
  );
};
