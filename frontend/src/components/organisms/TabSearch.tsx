import { FC, type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/hooks/useLanguage";

export interface TabSearchItem {
  value: string;
  label: string;
  icon: LucideIcon;
  group?: string;
}

interface TabSearchProps {
  items: TabSearchItem[];
  onSelect: (value: string) => void;
}

export const TabSearch: FC<TabSearchProps> = ({ items, onSelect }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

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

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q) || (item.group ?? "").toLowerCase().includes(q));
  }, [items, query]);

  const select = (value: string) => {
    onSelect(value);
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
      select(filtered[activeIndex].value);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-gray-700/60 bg-gray-800/90 py-2 pl-3 pr-3 text-gray-400 hover:text-emerald-400 transition-colors"
        aria-label={t("tabSearch")}
      >
        <Search className="h-4 w-4 shrink-0" />
        <kbd className="hidden md:inline-flex items-center rounded border border-gray-600 bg-gray-900/70 px-1.5 py-0.5 text-[10px] text-gray-400 font-mono">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 p-0 gap-0 overflow-hidden top-[20%] translate-y-0">
          <DialogTitle className="sr-only">{t("tabSearch")}</DialogTitle>
          <div className="flex items-center gap-2 border-b border-gray-700/60 pl-3 pr-10">
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
                  onClick={() => select(item.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? "bg-emerald-600/20 text-emerald-300" : "text-gray-300 hover:bg-gray-800"}`}
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
