"use client";

import { FC, useState, useEffect, useRef } from "react";
import { HytaleServerStatus } from "@/lib/types/hytale";
import { getHytaleServerLogs } from "@/services/hytale/fetchs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface HytaleLogsTabProps {
  serverId: string;
  serverStatus: HytaleServerStatus;
}

export const HytaleLogsTab: FC<HytaleLogsTabProps> = ({ serverId, serverStatus }) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    if (serverStatus === "not_found") return;
    
    setIsLoading(true);
    try {
      const response = await getHytaleServerLogs(serverId, 500);
      setLogs(response.logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh && serverStatus === "running") {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, serverStatus, autoRefresh]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const downloadLogs = () => {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${serverId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatLog = (log: string) => {
    // Color-code log levels
    if (log.includes("[ERROR]") || log.includes("ERROR")) {
      return <span className="text-red-400">{log}</span>;
    }
    if (log.includes("[WARN]") || log.includes("WARNING")) {
      return <span className="text-yellow-400">{log}</span>;
    }
    if (log.includes("[INFO]")) {
      return <span className="text-blue-400">{log}</span>;
    }
    return <span className="text-gray-300">{log}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t("refresh")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadLogs}
            disabled={!logs}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("download")}
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-gray-600"
          />
          {t("autoRefresh")}
        </label>
      </div>

      <div className="bg-gray-950 rounded-lg border border-gray-700/40 p-4 h-[400px] overflow-auto font-mono text-sm">
        {serverStatus === "not_found" ? (
          <p className="text-gray-500 text-center py-8">{t("serverNotFound")}</p>
        ) : logs ? (
          <div className="space-y-0.5">
            {logs.split("\n").map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {formatLog(line)}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            {isLoading ? t("loadingLogs") : t("noLogs")}
          </p>
        )}
      </div>
    </div>
  );
};
