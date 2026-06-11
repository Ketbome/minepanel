"use client";

import { FC } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { BedrockAddon } from "@/services/bedrock-addons/bedrock-addons.service";
import { CheckCircle2, ChevronDown, ChevronUp, CircleOff, GripVertical, Loader2, Trash2 } from "lucide-react";

export const normalizeAddonText = (value: string) =>
  value
    .replace(/§./g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

interface BedrockAddonItemProps {
  addon: BedrockAddon;
  index: number;
  total: number;
  disabled: boolean;
  actionId: string | null;
  onToggle: (addon: BedrockAddon) => void;
  onRequestDelete: (addon: BedrockAddon) => void;
  onMove: (addon: BedrockAddon, direction: -1 | 1) => void;
  onDragEnd: () => void;
}

export const BedrockAddonItem: FC<BedrockAddonItemProps> = ({ addon, index, total, disabled, actionId, onToggle, onRequestDelete, onMove, onDragEnd }) => {
  const { t } = useLanguage();
  const dragControls = useDragControls();
  const canReorder = !disabled && total > 1;

  return (
    <Reorder.Item
      as="div"
      value={addon}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="rounded-xl border border-gray-700/70 bg-linear-to-br from-gray-900/65 to-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:border-emerald-500/25"
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label={t("bedrockAddonsDragHandle")}
            disabled={!canReorder}
            onPointerDown={(event) => {
              event.preventDefault();
              dragControls.start(event);
            }}
            className="cursor-grab touch-none rounded-lg border border-gray-700/70 bg-gray-900/70 p-1.5 text-gray-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-minecraft text-emerald-300">
            #{index + 1}
          </Badge>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              aria-label={t("bedrockAddonsMoveUp")}
              title={t("bedrockAddonsMoveUp")}
              disabled={!canReorder || index === 0}
              onClick={() => onMove(addon, -1)}
              className="rounded-md border border-gray-700/70 bg-gray-900/70 p-1 text-gray-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={t("bedrockAddonsMoveDown")}
              title={t("bedrockAddonsMoveDown")}
              disabled={!canReorder || index === total - 1}
              onClick={() => onMove(addon, 1)}
              className="rounded-md border border-gray-700/70 bg-gray-900/70 p-1 text-gray-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-100">{normalizeAddonText(addon.name)}</p>
                <Badge variant="outline" className={addon.enabled ? "rounded-full border-emerald-500/40 bg-emerald-950/35 px-2.5 py-1 text-xs font-minecraft uppercase tracking-[0.12em] text-emerald-300" : "rounded-full border-gray-600 bg-gray-900/70 px-2.5 py-1 text-xs font-minecraft uppercase tracking-[0.12em] text-gray-300"}>
                  {addon.enabled ? t("bedrockAddonsEnabledBadge") : t("bedrockAddonsDisabledBadge")}
                </Badge>
                <Badge variant="outline" className="rounded-full border-cyan-500/40 bg-cyan-950/25 px-2.5 py-1 text-xs font-minecraft uppercase tracking-[0.12em] text-cyan-300">
                  {addon.source === "curseforge" ? "CurseForge" : t("upload")}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">{addon.fileName}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">{t("bedrockAddonsDetectedPacks")}</p>
            <div className="flex flex-wrap gap-2">
              {addon.packs.map((pack) => (
                <Badge key={`${addon.id}-${pack.kind}-${pack.uuid}`} variant="outline" className="rounded-full border-gray-600/80 bg-gray-900/80 px-3 py-1 text-gray-200">
                  {pack.kind === "behavior" ? "BP" : "RP"} · {normalizeAddonText(pack.name)}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              variant={addon.enabled ? "minepanelOutline" : "minepanel"}
              onClick={() => onToggle(addon)}
              disabled={actionId === addon.id || disabled}
              className={addon.enabled ? "font-minecraft text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-950/30 hover:text-emerald-200" : "font-minecraft"}
            >
              {actionId === addon.id ? <Loader2 className="h-4 w-4 animate-spin" /> : addon.enabled ? <CircleOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {addon.enabled ? t("bedrockAddonsDisableButton") : t("bedrockAddonsEnableButton")}
            </Button>
            <Button
              type="button"
              variant="minepanelDanger"
              onClick={() => onRequestDelete(addon)}
              disabled={actionId === `delete-${addon.id}` || disabled}
              className="font-minecraft"
            >
              {actionId === `delete-${addon.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("delete")}
            </Button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
};
