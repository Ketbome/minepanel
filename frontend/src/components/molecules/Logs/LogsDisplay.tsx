import { LogEntry, LogsError } from "../Tabs/LogsTab";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { CardContent } from "@/components/ui/card";
import { Terminal, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FC, memo, useMemo, useState } from "react";
import { AnsiText } from "@/lib/utils/ansiParser";
import { isChat, lineTone, parseLogLine, repeatKey, shortSource } from "@/lib/utils/log-lines";

interface LogsDisplayProps {
  logsContainerRef: React.RefObject<HTMLPreElement>;
  filteredLogEntries: LogEntry[];
  logs: string;
  loading: boolean;
  error: LogsError | null;
  hasErrors: boolean;
  handleRefreshLogs: () => void | Promise<void>;
  compact: boolean;
  groupRepeats: boolean;
  highlight: RegExp | null;
}

interface LogRow {
  entry: LogEntry;
  count: number;
  trace: LogEntry[];
}

// Stack frames hang off the line they belong to, and consecutive lines with the same text
// (ignoring the time) collapse into one with a counter.
const groupRows = (entries: LogEntry[], group: boolean): LogRow[] => {
  const rows: Array<LogRow & { key: string }> = [];
  for (const entry of entries) {
    const last = rows[rows.length - 1];
    if (entry.continuation && last?.entry.id === entry.parentId) {
      last.trace.push(entry);
      continue;
    }
    const key = group ? repeatKey(entry.content) : entry.id;
    if (group && last?.key === key && last.trace.length === 0) {
      last.count += 1;
      last.entry = entry;
    } else {
      rows.push({ entry, count: 1, trace: [], key });
    }
  }
  return rows;
};

const TRACE_PREVIEW = 3;

const TONE_CLASS = { join: "text-emerald-300", leave: "text-gray-400", ready: "text-emerald-300 font-semibold" } as const;

// Plain text with the search matches marked. Coloured (ANSI) text is left to AnsiText.
const Highlighted: FC<{ text: string; pattern: RegExp | null }> = ({ text, pattern }) => {
  if (!pattern || text.includes("\x1b")) return <AnsiText text={text} />;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (!match[0]) continue;
    const index = match.index ?? 0;
    parts.push(text.slice(last, index), <mark key={index} className="rounded bg-amber-400/30 px-0.5 text-inherit">{match[0]}</mark>);
    last = index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
};

// Memoized: the console re-renders on every poll, and most lines have not changed.
const LogLine = memo(function LogLine({ content, compact, highlight }: { content: string; compact: boolean; highlight: RegExp | null }) {
  const tone = lineTone(content);
  const parts = compact ? parseLogLine(content) : null;
  if (!parts) return <span className={tone ? TONE_CLASS[tone] : undefined}><Highlighted text={content} pattern={highlight} /></span>;
  const source = shortSource(parts.source) ?? (parts.thread !== "Server thread" ? parts.thread : undefined);
  return (
    <span title={content}>
      <span className="mr-2 text-gray-500">{parts.time}</span>
      {source && <span className="mr-1 text-gray-400">{source}:</span>}
      <span className={tone ? TONE_CLASS[tone] : undefined}><Highlighted text={parts.message} pattern={highlight} /></span>
    </span>
  );
});

export const LogsDisplay: FC<LogsDisplayProps> = ({ logsContainerRef, filteredLogEntries, logs, loading, error, hasErrors, handleRefreshLogs, compact, groupRepeats, highlight }) => {
  const { t } = useLanguage();
  const rows = useMemo(() => groupRows(filteredLogEntries, groupRepeats), [filteredLogEntries, groupRepeats]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleTrace = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const statusBarClassName = "absolute top-0 right-0 px-3 py-1 text-xs font-minecraft rounded-bl-md flex items-center border-l border-b border-gray-700/50 " + (error ? "bg-red-800/80 text-red-400" : hasErrors ? "bg-yellow-800/80 text-yellow-400" : "bg-gray-800/80 text-emerald-400");

  return (
    <CardContent className="pt-0 overflow-hidden">
      <div className="relative border border-gray-700/50 rounded-md shadow-inner overflow-hidden">
        <div className={statusBarClassName}>
          <Terminal className="h-3 w-3 mr-1" />
          {error ? t("error") : hasErrors ? t("withErrors") : t("console")}
        </div>
        <pre ref={logsContainerRef} className={`logs-container p-4 pt-6 rounded-md overflow-x-hidden overflow-y-auto text-xs font-mono border-gray-700/50 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 h-[600px] max-w-full break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${error ? "bg-red-950/40 text-red-300" : hasErrors ? "bg-yellow-950/20 text-emerald-400" : "bg-gray-950/80 text-emerald-400"}`}>
          {filteredLogEntries.length > 0 ? (
            <div className="minecraft-log">
              {rows.map(({ entry, count, trace }) => {
                const chat = entry.level === "info" && isChat(entry.content);
                return (
                  <div key={entry.id} className={`log-entry mb-1 p-1 rounded ${entry.level === "error" ? "bg-red-900/20 border-l-2 border-red-500" : entry.level === "warn" ? "bg-yellow-900/20 border-l-2 border-yellow-500" : chat ? "bg-sky-900/20 border-l-2 border-sky-400" : entry.level === "debug" ? "bg-gray-800/20" : ""}`}>
                    <span className={`level-indicator mr-2 px-1 rounded text-xs ${entry.level === "error" ? "bg-red-600 text-white" : entry.level === "warn" ? "bg-yellow-600 text-white" : chat ? "bg-sky-600 text-white" : entry.level === "info" ? "bg-blue-600 text-white" : entry.level === "debug" ? "bg-gray-600 text-white" : "bg-gray-500 text-white"}`}>{chat ? t("logChat").toUpperCase() : entry.level.toUpperCase()}</span>
                    <LogLine content={entry.content} compact={compact} highlight={highlight} />
                    {count > 1 && <span className="ml-2 rounded bg-gray-700 px-1 text-xs text-gray-200" title={t("logRepeated")}>×{count}</span>}
                    {trace.length > 0 && (
                      <div className="mt-1 border-l border-gray-700 pl-4 text-gray-400">
                        {(expanded.has(entry.id) ? trace : trace.slice(0, TRACE_PREVIEW)).map((line) => (
                          <div key={line.id}><Highlighted text={line.content} pattern={highlight} /></div>
                        ))}
                        {trace.length > TRACE_PREVIEW && (
                          <button type="button" onClick={() => toggleTrace(entry.id)} className="mt-0.5 text-xs text-sky-400 hover:underline">
                            {expanded.has(entry.id) ? t("logTraceHide") : `${t("logTraceShow")} (${trace.length - TRACE_PREVIEW})`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : logs ? (
            <div className="minecraft-log">
              <AnsiText text={logs} />
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCcw className="h-5 w-5 animate-spin text-gray-400" />
                <span className="text-gray-400 font-minecraft text-sm">{t("loadingLogs")}</span>
                <Image src="/images/loading-cube.webp" alt="Loading" width={32} height={32} className="animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center text-red-400 gap-4">
              <XCircle className="h-16 w-16 opacity-70" />
              <div className="text-center">
                <span className="font-minecraft text-sm block mb-2">{t("errorLoadingLogs")}</span>
                <span className="text-xs text-red-300">{error.message}</span>
              </div>
              <Button onClick={handleRefreshLogs} variant="outline" className="gap-2 bg-red-600/20 border-red-600/30 hover:bg-red-600/30 text-red-400 font-minecraft">
                <RefreshCcw className="h-4 w-4" />
                {t("retry")}
              </Button>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-500 gap-4">
              <Image src="/images/empty-chest.png" alt="No Logs" width={64} height={64} className="opacity-70" />
              <span className="font-minecraft text-sm">{t("noLogsAvailable")}</span>
            </div>
          )}
        </pre>
      </div>
    </CardContent>
  );
};
