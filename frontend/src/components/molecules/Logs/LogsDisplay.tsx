import { LogEntry, LogsError } from "../Tabs/LogsTab";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { CardContent } from "@/components/ui/card";
import { Terminal, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FC } from "react";

interface LogsDisplayProps {
  logsContainerRef: React.RefObject<HTMLPreElement>;
  filteredLogEntries: LogEntry[];
  logs: string;
  loading: boolean;
  error: LogsError | null;
  hasErrors: boolean;
  handleRefreshLogs: () => void | Promise<void>;
}

export const LogsDisplay: FC<LogsDisplayProps> = ({ logsContainerRef, filteredLogEntries, logs, loading, error, hasErrors, handleRefreshLogs }) => {
  const { t } = useLanguage();
  const statusBarClassName = "absolute top-0 right-0 px-3 py-1 text-xs font-minecraft rounded-bl-md flex items-center border-l border-b border-gray-700/50 " + (error ? "bg-red-800/80 text-red-400" : hasErrors ? "bg-yellow-800/80 text-yellow-400" : "bg-gray-800/80 text-emerald-400");

  return (
    <CardContent className="pt-0">
      <div className="relative border border-gray-700/50 rounded-md shadow-inner">
        <div className={statusBarClassName}>
          <Terminal className="h-3 w-3 mr-1" />
          {error ? t("error") : hasErrors ? t("withErrors") : t("console")}
        </div>
        <pre ref={logsContainerRef} className={`logs-container p-4 pt-6 rounded-md overflow-auto text-xs font-mono border-gray-700/50 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 h-[600px] ${error ? "bg-red-950/40 text-red-300" : hasErrors ? "bg-yellow-950/20 text-emerald-400" : "bg-gray-950/80 text-emerald-400"}`}>
          {filteredLogEntries.length > 0 ? (
            <div className="minecraft-log">
              {filteredLogEntries.map((entry: any) => (
                <div key={entry.id} className={`log-entry mb-1 p-1 rounded ${entry.level === "error" ? "bg-red-900/20 border-l-2 border-red-500" : entry.level === "warn" ? "bg-yellow-900/20 border-l-2 border-yellow-500" : entry.level === "debug" ? "bg-gray-800/20" : ""}`}>
                  <span className={`level-indicator mr-2 px-1 rounded text-xs ${entry.level === "error" ? "bg-red-600 text-white" : entry.level === "warn" ? "bg-yellow-600 text-white" : entry.level === "info" ? "bg-blue-600 text-white" : entry.level === "debug" ? "bg-gray-600 text-white" : "bg-gray-500 text-white"}`}>{entry.level.toUpperCase()}</span>
                  {entry.content}
                </div>
              ))}
            </div>
          ) : logs ? (
            <div className="minecraft-log">{logs}</div>
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
}
