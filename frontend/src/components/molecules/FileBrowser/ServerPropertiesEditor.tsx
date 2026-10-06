"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, History, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/hooks/useLanguage";
import type { TranslationKey } from "@/lib/translations";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { filesService, type FileItem } from "@/services/files/files.service";
import { FileEditor } from "./FileEditor";
import { appendProperty, describePropertyChanges, managedTab, PANEL_KEYS, parseProperties, propertyCategory, replacePropertyValue, type PropertyCategory } from "./server-properties-model";
import { isAvailable, isValidValue, PROPERTY_BY_KEY, SERVER_PROPERTIES } from "./server-properties-schema";

interface Props {
  serverId: string;
  path: string;
  content: string;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
  version?: string;
}

type Pending = { kind: "save" | "restore"; next: string; backupName?: string };
type CategoryFilter = PropertyCategory | "all";
type StateFilter = "all" | "changed" | "errors";

const HELP: Record<string, TranslationKey> = {
  "max-tick-time": "propertiesMaxTickTimeHelp",
  "network-compression-threshold": "propertiesCompressionHelp",
  "max-world-size": "propertiesMaxWorldSizeHelp",
  "require-resource-pack": "propertiesRequirePackHelp",
  "hide-online-players": "propertiesHidePlayersHelp",
  "broadcast-console-to-ops": "propertiesBroadcastHelp",
  "resource-pack-prompt": "propertiesPackPromptHelp",
};

const BACKUP_NAME = /^server\.properties\.\d{4}-\d{2}-\d{2}T[\d-]+Z\.[0-9a-f-]+\.bak$/;
const MAX_PREVIEW_CHANGES = 20;

export function ServerPropertiesEditor({ serverId, path, content, onSave, onClose, version }: Props) {
  const { t, language } = useLanguage();
  const [draft, setDraft] = useState(content);
  const [raw, setRaw] = useState(false);
  const [rawStart, setRawStart] = useState(content);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [pending, setPending] = useState<Pending | null>(null);
  const [applying, setApplying] = useState(false);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [backups, setBackups] = useState<FileItem[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [readingBackup, setReadingBackup] = useState<string | null>(null);

  const entries = useMemo(() => parseProperties(draft), [draft]);
  const oldLines = useMemo(() => content.split(/\r?\n/), [content]);
  const draftLines = useMemo(() => draft.split(/\r?\n/), [draft]);
  const managed = entries.filter((entry) => PANEL_KEYS.has(entry.key));
  const editable = entries.filter((entry) => !PANEL_KEYS.has(entry.key));
  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const result = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry.key)) result.add(entry.key);
      seen.add(entry.key);
    }
    return result;
  }, [entries]);
  const errors = editable.filter((entry) => !isValidValue(PROPERTY_BY_KEY.get(entry.key), entry.value)).map((entry) => entry.key);
  const missing = useMemo(() => {
    const present = new Set(entries.map((entry) => entry.key));
    return SERVER_PROPERTIES.filter((def) => isAvailable(def, version) && !PANEL_KEYS.has(def.key) && !present.has(def.key));
  }, [entries, version]);
  const matches = (key: string) => key.toLowerCase().includes(query.trim().toLowerCase());
  const filtered = editable.filter((entry) => {
    if (!matches(entry.key)) return false;
    if (category !== "all" && propertyCategory(entry.key) !== category) return false;
    if (stateFilter === "changed" && oldLines[entry.index] === draftLines[entry.index]) return false;
    if (stateFilter === "errors" && !errors.includes(entry.key)) return false;
    return true;
  });
  const changed = draft !== content;
  const changes = useMemo(() => pending ? describePropertyChanges(content, pending.next) : [], [content, pending]);
  const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

  const openRaw = () => {
    setRawStart(draft);
    setRaw(true);
  };

  const loadBackups = async () => {
    setBackupsLoading(true);
    try {
      const files = await filesService.listFiles(serverId, folder);
      setBackups(files.filter((file) => !file.isDirectory && BACKUP_NAME.test(file.name)).sort((a, b) => b.modified.localeCompare(a.modified)));
    } catch {
      mcToast.error(t("errorLoadingFiles"));
    } finally {
      setBackupsLoading(false);
    }
  };

  const toggleBackups = () => {
    const next = !backupsOpen;
    setBackupsOpen(next);
    if (next) void loadBackups();
  };

  const reviewBackup = async (file: FileItem) => {
    setReadingBackup(file.name);
    try {
      const result = await filesService.readFile(serverId, file.path);
      setPending({ kind: "restore", next: result.content, backupName: file.name });
    } catch {
      mcToast.error(t("errorReadingFile"));
    } finally {
      setReadingBackup(null);
    }
  };

  const applyPending = async () => {
    if (!pending || applying || changes.length === 0) return;
    setApplying(true);
    try {
      await onSave(pending.next);
      setPending(null);
    } catch {
      // FileBrowser reports the save error and leaves the editor open.
    } finally {
      setApplying(false);
    }
  };

  const reviewDialog = <Dialog open={pending !== null} onOpenChange={(open) => { if (!open && !applying) setPending(null); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{pending?.kind === "restore" ? t("propertiesReviewRestore") : t("propertiesReviewSave")}</DialogTitle>
        <DialogDescription>{pending?.kind === "restore" ? pending.backupName : t("propertiesBackupHint")}</DialogDescription>
      </DialogHeader>
      {pending?.kind === "restore" && changed && <Alert><AlertDescription>{t("propertiesUnsavedRestore")}</AlertDescription></Alert>}
      <div className="max-h-[45vh] overflow-y-auto border border-border">
        {changes.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{t("propertiesNoDifferences")}</p> :
          <ul className="divide-y divide-border">{changes.slice(0, MAX_PREVIEW_CHANGES).map((change, index) => <li key={`${change.label}-${index}`} className="p-3 text-sm">
            <code className="font-semibold">{change.label}</code>
            <div className="mt-1 grid gap-2 sm:grid-cols-2"><p className="break-all text-muted-foreground">− {change.before || "∅"}</p><p className="break-all text-foreground">+ {change.after || "∅"}</p></div>
          </li>)}</ul>}
        {changes.length > MAX_PREVIEW_CHANGES && <p className="p-3 text-xs text-muted-foreground">+{changes.length - MAX_PREVIEW_CHANGES} {t("propertiesMoreChanges")}</p>}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setPending(null)} disabled={applying}>{t("cancel")}</Button><Button onClick={applyPending} disabled={applying || changes.length === 0}>{applying ? t("saving") : pending?.kind === "restore" ? t("propertiesRestore") : t("save")}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;

  if (raw) return <>
    <Button variant="outline" onClick={() => setRaw(false)} className="mb-3">{t("propertiesGuided")}</Button>
    <FileEditor path={path} content={rawStart} baselineContent={content} onContentChange={setDraft} onSave={async (next) => { setDraft(next); setPending({ kind: "save", next }); }} onClose={() => setRaw(false)} />
    {reviewDialog}
  </>;

  return <>
    <div className="mc-panel flex h-[600px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={onClose} aria-label={t("back")}><ArrowLeft className="size-4" /></Button><div><h2 className="font-minecraft text-lg">server.properties</h2><p className="text-xs text-muted-foreground">{t("propertiesBackupHint")}</p></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={toggleBackups}><History data-icon="inline-start" />{t("backups")}</Button><Button variant="outline" onClick={openRaw}>{t("propertiesRaw")}</Button><Button onClick={() => setPending({ kind: "save", next: draft })} disabled={!changed || errors.length > 0 || duplicates.size > 0}><Save data-icon="inline-start" />{t("propertiesReview")}</Button></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {backupsOpen && <section className="mb-5 border border-border p-3" aria-label={t("propertiesBackupHistory")}>
          <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">{t("propertiesBackupHistory")}</h3><Button variant="ghost" size="sm" onClick={loadBackups} disabled={backupsLoading}>{t("refresh")}</Button></div>
          {backupsLoading ? <p className="text-sm text-muted-foreground">{t("loading")}</p> : backups.length === 0 ? <p className="text-sm text-muted-foreground">{t("propertiesNoBackups")}</p> :
            <ul className="max-h-40 divide-y divide-border overflow-y-auto">{backups.map((file) => <li key={file.path} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{new Date(file.modified).toLocaleString(language)} · {Math.ceil(file.size / 1024)} KB</span><Button size="sm" variant="outline" onClick={() => reviewBackup(file)} disabled={readingBackup !== null} aria-label={`${t("preview")}: ${file.name}`}>{readingBackup === file.name ? t("loading") : t("preview")}</Button></li>)}</ul>}
        </section>}
        {managed.length > 0 && <Alert className="mb-4"><AlertDescription>
          <details><summary className="cursor-pointer">{t("propertiesPanelManaged")} ({managed.length})</summary><ul className="mt-2 flex flex-wrap gap-2">{managed.map((entry) => <li key={entry.index}><a href={changed ? undefined : `#${managedTab(entry.key)}`} aria-disabled={changed} className="text-primary underline aria-disabled:cursor-not-allowed aria-disabled:no-underline" title={changed ? t("propertiesFinishEdits") : undefined}><code>{entry.key}</code> → {t(managedTab(entry.key))}</a></li>)}</ul></details>
        </AlertDescription></Alert>}
        <div className="mb-4 flex flex-wrap gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("propertiesSearch")} aria-label={t("propertiesSearch")} className="min-w-40 flex-1" />
          <select className="mc-input" value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)} aria-label={t("propertiesCategory")}>
            <option value="all">{t("propertiesAllCategories")}</option><option value="game">{t("game")}</option><option value="network">{t("network")}</option><option value="performance">{t("performance")}</option><option value="other">{t("propertiesOtherCategory")}</option>
          </select>
          <select className="mc-input" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as StateFilter)} aria-label={t("propertiesStateFilter")}>
            <option value="all">{t("propertiesAllFields")}</option><option value="changed">{t("propertiesChangesOnly")}</option><option value="errors">{t("propertiesErrorsOnly")}</option>
          </select>
        </div>
        {duplicates.size > 0 && <Alert className="mb-4"><AlertDescription>{t("propertiesDuplicates")}: {[...duplicates].join(", ")}</AlertDescription></Alert>}
        {missing.length > 0 && <details className="mb-4 border border-border p-3"><summary className="cursor-pointer text-sm">{t("propertiesAddMissing")} ({missing.length})</summary>
          <ul className="mt-2 flex flex-wrap gap-2">{missing.filter((def) => matches(def.key) && (category === "all" || def.category === category)).map((def) => <li key={def.key}><Button size="sm" variant="outline" title={def.description} onClick={() => setDraft((old) => appendProperty(old, def.key, def.default))}><code>{def.key}</code></Button></li>)}</ul>
        </details>}
        {editable.length === 0 ? <p className="text-muted-foreground">{t("propertiesNoFields")}</p> : filtered.length === 0 ? <p className="text-muted-foreground">{t("propertiesNoMatches")}</p> : null}
        <div className="grid gap-3 md:grid-cols-2">{filtered.map((entry) => {
          const def = PROPERTY_BY_KEY.get(entry.key);
          const invalid = errors.includes(entry.key);
          const help = HELP[entry.key] ? t(HELP[entry.key]) : def?.description ?? t("propertiesCustomHelp");
          const set = (value: string) => setDraft((old) => replacePropertyValue(old, entry.index, value));
          return <label key={entry.index} className="block border border-border bg-background p-3" data-invalid={invalid || undefined}>
            <span className="mb-2 flex items-center gap-2 text-sm font-medium"><code>{entry.key}</code><span title={help} aria-label={help} className="cursor-help rounded border border-border px-1 text-xs text-muted-foreground">?</span></span>
            {def?.type === "enum" ?
              <select className="mc-input w-full" value={entry.value} aria-invalid={invalid} onChange={(event) => set(event.target.value)}>{[...new Set([...def.options!, entry.value])].map((option) => <option key={option} value={option}>{option}</option>)}</select> :
            def?.type === "boolean" || (!def && (entry.value === "true" || entry.value === "false")) ?
              <select className="mc-input w-full" value={entry.value} aria-invalid={invalid} onChange={(event) => set(event.target.value)}>{[...new Set(["true", "false", entry.value])].map((option) => <option key={option} value={option}>{option}</option>)}</select> :
              <Input value={entry.value} type={def?.type === "int" ? "number" : "text"} min={def?.min} max={def?.max} aria-invalid={invalid} onChange={(event) => set(event.target.value)} />}
            <span className="mt-2 block text-xs text-muted-foreground">{help}</span>
            {def && !isAvailable(def, version) && <span className="block text-xs text-amber-400">{t("propertiesIgnored")}</span>}
            {invalid && <span role="alert" className="text-xs text-destructive">{t("propertiesInvalid")}</span>}
          </label>;
        })}</div>
      </div>
    </div>
    {reviewDialog}
  </>;
}
