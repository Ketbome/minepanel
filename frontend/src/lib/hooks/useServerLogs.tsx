import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { getServerLogsStream } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface LogsError {
  type: "container_not_found" | "server_not_found" | "connection_error" | "unknown";
  message: string;
}

interface LogEntry {
  id: string;
  content: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
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
  const [regex, setRegex] = useState<boolean>(false);
  const [sinceMinutes, setSinceMinutes] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousLogsRef = useRef<string>("");
  const lastTimestampRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  const parseLogLevel = useCallback((content: string): "info" | "warn" | "error" | "debug" => {
    const upperContent = content.toUpperCase();
    if (upperContent.includes("[ERROR]") || upperContent.includes("ERROR") || upperContent.includes("SEVERE") || upperContent.includes("FATAL")) {
      return "error";
    }
    if (upperContent.includes("[WARN]") || upperContent.includes("WARNING") || upperContent.includes("WARN")) {
      return "warn";
    }
    if (upperContent.includes("[DEBUG]") || upperContent.includes("DEBUG") || upperContent.includes("DEBU")) {
      return "debug";
    }
    return "info";
  }, []);

  const cleanLogContent = useCallback((line: string): string => {
    // Solo limpiar caracteres de control innecesarios, mantener códigos ANSI
    let cleaned = line.replace(/>\[2K/g, "");
    cleaned = cleaned.replace(/\r/g, "");

    // Remover timestamp Docker al inicio
    cleaned = cleaned.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, "");

    return cleaned.trim();
  }, []);

  const parseLogsToEntries = useCallback(
    (logsContent: string, existingEntries: LogEntry[] = []): LogEntry[] => {
      if (!logsContent) return [];

      const lines = logsContent.split("\n").filter((line) => line.trim());

      const existingContents = new Set(existingEntries.map((entry) => entry.content));

      return lines
        .filter((line) => !existingContents.has(cleanLogContent(line)))
        .map((line, index) => ({
          id: `${Date.now()}-${index}`,
          content: cleanLogContent(line),
          timestamp: new Date(),
          level: parseLogLevel(line),
        }));
    },
    [parseLogLevel, cleanLogContent]
  );

  const startRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (!isRealTime) return;

      try {
        const since = lastTimestampRef.current || undefined;
        const data = await getServerLogsStream(serverId, lineCount, since);

        if (data.logs?.trim()) {
          if (isInitialLoadRef.current || !lastTimestampRef.current) {
            setLogs(data.logs);
            setLogEntries(parseLogsToEntries(data.logs, []));
            isInitialLoadRef.current = false;
          } else {
            const newLines = data.logs.split("\n").filter((line) => line.trim());
            if (newLines.length > 0) {
              setLogs((prevLogs) => {
                const combined = prevLogs ? `${prevLogs}\n${data.logs}` : data.logs;
                const allLines = combined.split("\n");
                return allLines.slice(-2000).join("\n");
              });

              setLogEntries((prevEntries) => {
                const newEntries = parseLogsToEntries(data.logs, prevEntries);
                const combined = [...prevEntries, ...newEntries];
                return combined.slice(-2000);
              });
            }
          }

          if (data.lastTimestamp) {
            lastTimestampRef.current = data.lastTimestamp;
          }

          setLastUpdate(new Date());

          const errorPatterns = [/ERROR/gi, /SEVERE/gi, /FATAL/gi, /Exception/gi, /java\.lang\./gi, /Caused by:/gi, /\[STDERR\]/gi, /Failed to/gi, /Cannot/gi, /Unable to/gi];
          const logsHaveErrors = errorPatterns.some((pattern) => pattern.test(data.logs));
          setHasErrors((prev) => prev || logsHaveErrors);
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
      const data = await getServerLogsStream(serverId, lineCount);

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
        setLogEntries(parseLogsToEntries(data.logs, []));
        setLastUpdate(new Date());
        previousLogsRef.current = data.logs;

        if (data.lastTimestamp) {
          lastTimestampRef.current = data.lastTimestamp;
        }

        isInitialLoadRef.current = false;

        const errorPatterns = [/ERROR/gi, /SEVERE/gi, /FATAL/gi, /Exception/gi, /java\.lang\./gi, /Caused by:/gi, /\[STDERR\]/gi, /Failed to/gi, /Cannot/gi, /Unable to/gi];

        const logsHaveErrors = errorPatterns.some((pattern) => pattern.test(data.logs));
        setHasErrors(data.hasErrors || logsHaveErrors);
      }

      return data.logs;
    } catch (error) {
      console.error("Error fetching logs:", error);
      const errorMessage = error instanceof Error ? error.message : t("unknownError");

      setError({
        type: "unknown",
        message: errorMessage,
      });

      mcToast.error(t("errorGettingLogsServer"));
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

  const filteredLogEntries = useMemo(() => {
    let matcher: (content: string) => boolean = () => true;
    let invalidRegex = false;
    if (searchTerm !== "") {
      if (regex) {
        try {
          const re = new RegExp(searchTerm, "i");
          matcher = (content) => re.test(content);
        } catch {
          invalidRegex = true;
        }
      } else {
        const needle = searchTerm.toLowerCase();
        matcher = (content) => content.toLowerCase().includes(needle);
      }
    }
    // Server log lines only carry a time of day: read it, and treat a time ahead of now as yesterday.
    // Continuation lines (stack traces) inherit the previous line's time; lines before the first stamp stay visible.
    const now = Date.now();
    const cutoff = sinceMinutes > 0 ? now - sinceMinutes * 60_000 : 0;
    let lineTime: number | null = null;
    return logEntries.filter((entry) => {
      const stamp = /\[(\d{2}):(\d{2}):(\d{2})/.exec(entry.content);
      if (stamp) {
        const t = new Date(now);
        t.setHours(Number(stamp[1]), Number(stamp[2]), Number(stamp[3]), 0);
        lineTime = t.getTime() > now ? t.getTime() - 86_400_000 : t.getTime();
      }
      const inRange = cutoff === 0 || lineTime === null || lineTime >= cutoff;
      return inRange && !invalidRegex && matcher(entry.content) && (levelFilter === "all" || entry.level === levelFilter);
    });
  }, [logEntries, searchTerm, levelFilter, regex, sinceMinutes]);

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
    regex,
    sinceMinutes,
    fetchLogs,
    setLogLines,
    clearError,
    toggleRealTime,
    setSearchTerm,
    setLevelFilter,
    setRegex,
    setSinceMinutes,
    startRealTimeUpdates,
    stopRealTimeUpdates,
  };
}
