import { FC, type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { cn } from "@/lib/utils";

export interface TabSearchItem {
  value: string;
  label: string;
  icon: LucideIcon;
  target: string;
  group?: string;
  keywords?: string;
}

interface TabSearchProps {
  items: TabSearchItem[];
  onSelect: (target: string) => void;
  collapsed?: boolean;
}

export const TabSearch: FC<TabSearchProps> = ({ items, onSelect, collapsed = false }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/mac/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q) || (item.group ?? "").toLowerCase().includes(q) || (item.keywords ?? "").toLowerCase().includes(q));
  }, [items, query]);

  const select = (target: string) => {
    onSelect(target);
    setOpen(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      select(filtered[activeIndex].target);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "mc-field flex items-center gap-2 text-gray-400 transition-colors hover:text-emerald-400",
          collapsed ? "justify-center p-2" : "w-full px-3 py-2",
        )}
        aria-label={t("tabSearch")}
        title={collapsed ? t("tabSearch") : undefined}
      >
        <Search className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left text-sm text-gray-500">{t("tabSearchPlaceholder")}</span>
            <kbd className="mc-chip inline-flex items-center bg-[var(--mc-stone-deep)] px-1.5 py-0.5 text-[10px] font-mono text-gray-400">{shortcutLabel}</kbd>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--mc-stone)] border-2 border-[var(--mc-frame)] text-gray-200 p-0 gap-0 overflow-hidden top-[20%] translate-y-0">
          <DialogTitle className="sr-only">{t("tabSearch")}</DialogTitle>
          <div className="mc-titlebar flex items-center gap-2 pl-3 pr-10">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t("tabSearchPlaceholder")}
              className="w-full bg-transparent py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-gray-500">{t("tabSearchEmpty")}</p>}
            {filtered.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => select(item.target)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-3 border-2 px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? "border-[var(--mc-frame)] bg-emerald-600/25 text-emerald-300" : "border-transparent text-gray-300 hover:bg-black/40"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 font-minecraft">{item.label}</span>
                  {item.group && <span className="text-xs text-gray-500">{item.group}</span>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
