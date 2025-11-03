import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, RefreshCcw, Cpu, Server, AlertTriangle, XCircle, CheckCircle, Clock, Search, Filter, Play, Pause } from "lucide-react";
import { useServerLogs } from "@/lib/hooks/useServerLogs";
import { getResources } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";
import Image from "next/image";
import LogsControls from "../Logs/LogsControls";
import LogsErrorAlert from "../Logs/LogsErrorAlert";
import LogsStatusAlert from "../Logs/LogsStatusAlert";
import LogsLastUpdate from "../Logs/LogsLastUpdate";
import LogsFooter from "../Logs/LogsFooter";
import LogsResources from "../Logs/LogsResources";
import { LogsDisplay } from "../Logs/LogsDisplay";
import { QuickCommandConsole } from "../Logs/QuickCommandConsole";

export interface LogEntry {
  id: string;
  content: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug" | "unknown";
}

export interface LogsError {
  type: "container_not_found" | "server_not_found" | "connection_error" | "unknown";
  message: string;
}

export interface ResourcesData {
  cpuUsage: string;
  memoryUsage: string;
  memoryLimit: string;
  status?: string;
}

interface LogsTabProps {
  serverId: string;
  rconPort?: string;
  rconPassword?: string;
  serverStatus?: string;
}

export function LogsTab({ serverId, rconPort, rconPassword, serverStatus }: Readonly<LogsTabProps>) {
  const { t } = useLanguage();
  const { logs, logEntries, filteredLogEntries, loading, lineCount, error, hasErrors, lastUpdate, isRealTime, searchTerm, levelFilter, fetchLogs, setLogLines, clearError, toggleRealTime, setSearchTerm, setLevelFilter } = useServerLogs(serverId);

  const logsContainerRef = useRef<HTMLPreElement>(null!);
  const [resources, setResources] = useState<ResourcesData | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const isUserScrollingRef = useRef(false);
  const manualScrollControlRef = useRef(false);

  useEffect(() => {
    fetchLogs();
    fetchServerResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNearBottom = (container: HTMLElement, threshold = 100) => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  useEffect(() => {
    const container = logsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!isUserScrollingRef.current && !manualScrollControlRef.current) {
        const nearBottom = isNearBottom(container);

        if (nearBottom !== autoScroll) {
          setAutoScroll(nearBottom);
        }
      }

      isUserScrollingRef.current = true;
      setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [autoScroll]);

  useEffect(() => {
    if (logsContainerRef.current && logs && autoScroll && !isUserScrollingRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const fetchServerResources = async () => {
    setLoadingResources(true);
    setResourcesError(null);
    try {
      const resourceData = await getResources(serverId);
      setResources(resourceData);
    } catch (error) {
      console.error("Error fetching server resources:", error);
      setResourcesError(t("errorFetchingResources"));
      setResources({
        cpuUsage: "N/A",
        memoryUsage: "N/A",
        memoryLimit: "N/A",
        status: "error",
      });
    } finally {
      setLoadingResources(false);
    }
  };

  const handleRefreshLogs = async () => {
    clearError();
    await fetchLogs();
  };

  const handleAutoScrollToggle = (value: boolean) => {
    manualScrollControlRef.current = true;
    setAutoScroll(value);

    if (value && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }

    setTimeout(() => {
      manualScrollControlRef.current = false;
    }, 500);
  };

  return (
    <Card className={`bg-gray-900/60 border-gray-700/50 shadow-lg transition-all duration-300 overflow-hidden`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
            <Image src="/images/command-block.webp" alt="Logs" width={24} height={24} className="opacity-90" />
            {t("serverLogs")}
            {isRealTime && (
              <div className="flex items-center ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                <span className="text-xs text-green-400">{t("liveLabel")}</span>
              </div>
            )}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {t("viewLogsRealtime")}
            {filteredLogEntries.length > 0 && (
              <span className="ml-2 text-emerald-400">
                ({filteredLogEntries.length} {t("entries")})
              </span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <LogsControls searchTerm={searchTerm} setSearchTerm={setSearchTerm} levelFilter={levelFilter} setLevelFilter={setLevelFilter} autoScroll={autoScroll} setAutoScroll={handleAutoScrollToggle} lineCount={lineCount} setLogLines={setLogLines} isRealTime={isRealTime} toggleRealTime={toggleRealTime} loading={loading} handleRefreshLogs={handleRefreshLogs} />
      <LogsErrorAlert error={error} resourcesError={resourcesError} />
      <LogsStatusAlert hasErrors={hasErrors} error={error} />
      <LogsLastUpdate lastUpdate={lastUpdate} error={error} />
      <LogsResources resources={resources} loadingResources={loadingResources} resourcesError={resourcesError} />
      <LogsDisplay logsContainerRef={logsContainerRef} filteredLogEntries={filteredLogEntries} logs={logs} loading={loading} error={error} hasErrors={hasErrors} handleRefreshLogs={handleRefreshLogs} />
      {rconPort && rconPassword && <QuickCommandConsole serverId={serverId} rconPort={rconPort} rconPassword={rconPassword} serverStatus={serverStatus || "stopped"} />}
      <LogsFooter error={error} hasErrors={hasErrors} isRealTime={isRealTime} lastUpdate={lastUpdate} filteredLogEntries={filteredLogEntries} logEntries={logEntries} loadingResources={loadingResources} fetchServerResources={fetchServerResources} resourcesError={resourcesError} />
      <style jsx global>{`
        .minecraft-log {
          line-height: 1.4;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .log-entry {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .minecraft-log .error,
        .minecraft-log .severe,
        .minecraft-log [level="ERROR"],
        .minecraft-log [level="SEVERE"] {
          color: #ff5555;
          background: rgba(255, 85, 85, 0.1);
          padding: 2px 4px;
          border-radius: 2px;
          font-weight: 600;
        }
        .minecraft-log .warn,
        .minecraft-log .warning,
        .minecraft-log [level="WARN"],
        .minecraft-log [level="WARNING"] {
          color: #ffaa00;
          background: rgba(255, 170, 0, 0.1);
          padding: 2px 4px;
          border-radius: 2px;
          font-weight: 500;
        }
        .minecraft-log .info,
        .minecraft-log [level="INFO"] {
          color: #55ffff;
        }
        .minecraft-log .debug,
        .minecraft-log [level="DEBUG"] {
          color: #aaaaaa;
        }
        /* Highlight error patterns */
        .minecraft-log:contains("Exception"),
        .minecraft-log:contains("java.lang."),
        .minecraft-log:contains("Caused by:"),
        .minecraft-log:contains("[STDERR]"),
        .minecraft-log:contains("Failed to"),
        .minecraft-log:contains("Cannot"),
        .minecraft-log:contains("Unable to") {
          background: rgba(255, 85, 85, 0.05);
          border-left: 3px solid #ff5555;
          padding-left: 8px;
          margin: 2px 0;
        }
        /* Fatal errors */
        .minecraft-log:contains("FATAL") {
          color: #ff1744;
          background: rgba(255, 23, 68, 0.15);
          padding: 4px 6px;
          border-radius: 4px;
          border: 1px solid rgba(255, 23, 68, 0.3);
          font-weight: 700;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        /* Success patterns */
        .minecraft-log:contains("Server started"),
        .minecraft-log:contains("Done ("),
        .minecraft-log:contains("successfully") {
          color: #4caf50;
          background: rgba(76, 175, 80, 0.1);
          padding: 2px 4px;
          border-radius: 2px;
          font-weight: 500;
        }
        /* Log entry styling */
        .log-entry {
          transition: background-color 0.2s ease;
        }
        .log-entry:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
        /* Estilizar scrollbar para navegadores webkit */
        .logs-container::-webkit-scrollbar {
          width: 8px;
        }
        .logs-container::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.7);
          border-radius: 4px;
        }
        .logs-container::-webkit-scrollbar-thumb {
          background-color: rgba(55, 65, 81, 0.7);
          border-radius: 4px;
          border: 2px solid rgba(17, 24, 39, 0.7);
        }
        .logs-container::-webkit-scrollbar-thumb:hover {
          background-color: rgba(75, 85, 99, 0.8);
        }
      `}</style>
    </Card>
  );
}
