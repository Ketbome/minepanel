import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { getServerLogs } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface LogsError {
  type: "container_not_found" | "server_not_found" | "connection_error" | "unknown";
  message: string;
}

interface LogEntry {
  id: string;
  content: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug" | "unknown";
}

export function useServerLogs(serverId: string) {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<string>("");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lineCount, setLineCount] = useState<number>(500);
  const [error, setError] = useState<LogsError | null>(null);
  const [hasErrors, setHasErrors] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRealTime, setIsRealTime] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousLogsRef = useRef<string>("");

  const parseLogLevel = useCallback((content: string): "info" | "warn" | "error" | "debug" | "unknown" => {
    const upperContent = content.toUpperCase();
    if (upperContent.includes("[ERROR]") || upperContent.includes("ERROR") || upperContent.includes("SEVERE") || upperContent.includes("FATAL")) {
      return "error";
    }
    if (upperContent.includes("[WARN]") || upperContent.includes("WARNING") || upperContent.includes("WARN")) {
      return "warn";
    }
    if (upperContent.includes("[DEBUG]") || upperContent.includes("DEBUG")) {
      return "debug";
    }
    if (upperContent.includes("[INFO]") || upperContent.includes("INFO")) {
      return "info";
    }
    return "unknown";
  }, []);

  const parseLogsToEntries = useCallback(
    (logsContent: string): LogEntry[] => {
      if (!logsContent) return [];

      const lines = logsContent.split("\n").filter((line) => line.trim());
      return lines.map((line, index) => ({
        id: `${Date.now()}-${index}`,
        content: line,
        timestamp: new Date(),
        level: parseLogLevel(line),
      }));
    },
    [parseLogLevel]
  );

  const startRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (!isRealTime) return;

      try {
        const data = await getServerLogs(serverId, lineCount);

        if (data.logs !== previousLogsRef.current) {
          previousLogsRef.current = data.logs;
          setLogs(data.logs);
          setLogEntries(parseLogsToEntries(data.logs));
          setLastUpdate(new Date());

          const errorPatterns = [/ERROR/gi, /SEVERE/gi, /FATAL/gi, /Exception/gi, /java\.lang\./gi, /Caused by:/gi, /\[STDERR\]/gi, /Failed to/gi, /Cannot/gi, /Unable to/gi];

          const logsHaveErrors = errorPatterns.some((pattern) => pattern.test(data.logs));
          setHasErrors(logsHaveErrors);
        }
      } catch (error) {
        console.error("Real-time log update failed:", error);
      }
    }, 3000);
  }, [serverId, lineCount, isRealTime, parseLogsToEntries]);

  const stopRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const toggleRealTime = useCallback(() => {
    setIsRealTime((prev) => {
      const newValue = !prev;
      if (newValue) {
        startRealTimeUpdates();
      } else {
        stopRealTimeUpdates();
      }
      return newValue;
    });
  }, [startRealTimeUpdates, stopRealTimeUpdates]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getServerLogs(serverId, lineCount);

      if (data.logs.includes("Container not found")) {
        setError({
          type: "container_not_found",
          message: t("containerNotFound"),
        });
        setLogs(t("serverNotRunning"));
      } else if (data.logs.includes("Server not found")) {
        setError({
          type: "server_not_found",
          message: t("serverNotFound"),
        });
        setLogs(t("serverNotFoundSpecified"));
      } else if (data.logs.includes("Error retrieving logs:")) {
        setError({
          type: "connection_error",
          message: t("connectionErrorDocker"),
        });
        setLogs(data.logs);
      } else {
        setLogs(data.logs);
        setLogEntries(parseLogsToEntries(data.logs));
        setLastUpdate(new Date());
        previousLogsRef.current = data.logs;

        const errorPatterns = [/ERROR/gi, /SEVERE/gi, /FATAL/gi, /Exception/gi, /java\.lang\./gi, /Caused by:/gi, /\[STDERR\]/gi, /Failed to/gi, /Cannot/gi, /Unable to/gi];

        const logsHaveErrors = errorPatterns.some((pattern) => pattern.test(data.logs));
        setHasErrors(logsHaveErrors);
      }

      return data.logs;
    } catch (error) {
      console.error("Error fetching logs:", error);
      const errorMessage = error instanceof Error ? error.message : t("unknownError");

      setError({
        type: "unknown",
        message: errorMessage,
      });

      toast.error(t("errorGettingLogsServer"));
      return "";
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRealTime) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }

    return () => {
      stopRealTimeUpdates();
    };
  }, [isRealTime, startRealTimeUpdates, stopRealTimeUpdates]);

  const setLogLines = (lines: number) => {
    setLineCount(lines);
  };

  const clearError = () => {
    setError(null);
  };

  const filteredLogEntries = logEntries.filter((entry) => {
    const matchesSearch = searchTerm === "" || entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "all" || entry.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return {
    logs,
    logEntries,
    filteredLogEntries,
    loading,
    lineCount,
    error,
    hasErrors,
    lastUpdate,
    isRealTime,
    searchTerm,
    levelFilter,
    fetchLogs,
    setLogLines,
    clearError,
    toggleRealTime,
    setSearchTerm,
    setLevelFilter,
    startRealTimeUpdates,
    stopRealTimeUpdates,
  };
}
