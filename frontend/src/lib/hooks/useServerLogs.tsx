import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { getServerLogsStream } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { cleanConsoleLine, isChat, isContinuation, isPanelNoise, levelOf, parseLogLine } from "@/lib/utils/log-lines";
import { useLogViewStore } from "@/lib/store/log-view-store";

interface LogsError {
  type: "container_not_found" | "server_not_found" | "connection_error" | "unknown";
  message: string;
}

interface LogEntry {
  id: string;
  content: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  // Docker's own timestamp for the line (UTC), when the stream carried one.
  loggedAt?: number;
  // Part of the line before it (a stack frame, "Caused by:"); takes that line's level.
  continuation?: boolean;
  // The header line a continuation belongs to.
  parentId?: string;
}

const parseDockerTime = (line: string): number | undefined => {
  const match = /^\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/.exec(line);
  const time = match ? Date.parse(match[1]) : NaN;
  return Number.isFinite(time) ? time : undefined;
};

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
  const hidePanelNoise = useLogViewStore((state) => state.hidePanelNoise);
  const [filterNow, setFilterNow] = useState(() => Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousLogsRef = useRef<string>("");
  const lastTimestampRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  const parseLogLevel = useCallback((content: string): "info" | "warn" | "error" | "debug" => {
    // The level the game wrote, when the line has the usual format; a chat message saying "error" stays info.
    const parts = parseLogLine(content);
    if (parts) return levelOf(parts.level);
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

    return cleanConsoleLine(cleaned).trim();
  }, []);

  const parseLogsToEntries = useCallback(
    (logsContent: string, existingEntries: LogEntry[] = []): LogEntry[] => {
      if (!logsContent) return [];

      const lines = logsContent.split("\n").filter((line) => line.trim());

      const existingContents = new Set(existingEntries.map((entry) => entry.content));

      let previous: LogEntry | undefined = existingEntries[existingEntries.length - 1];
      return lines
        .filter((line) => !existingContents.has(cleanLogContent(line)))
        .map((line, index) => {
          const content = cleanLogContent(line);
          // Leading whitespace marks a stack frame, so check before the content is trimmed.
          const raw = cleanConsoleLine(line.replace(/\r/g, "").replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z ?/, ""));
          const continuation = previous !== undefined && isContinuation(raw);
          const entry: LogEntry = {
            id: `${Date.now()}-${index}`,
            content,
            timestamp: new Date(),
            level: continuation && previous ? previous.level : parseLogLevel(content),
            loggedAt: parseDockerTime(line),
            continuation,
            parentId: continuation && previous ? (previous.continuation ? previous.parentId : previous.id) : undefined,
          };
          previous = entry;
          return entry;
        });
    },
    [parseLogLevel, cleanLogContent]
  );

  const startRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      // Hidden tabs skip ticks; the next visible one catches up through `since`.
      if (!isRealTime || document.hidden) return;

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

  useEffect(() => {
    if (sinceMinutes <= 0) return;
    setFilterNow(Date.now());
    const timer = setInterval(() => setFilterNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sinceMinutes]);

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
    // Docker's timestamp is UTC and independent of the game's log format, so the range holds in any
    // timezone and on Bedrock. Continuation lines inherit the previous line's time; lines before the first stay visible.
    const cutoff = sinceMinutes > 0 ? filterNow - sinceMinutes * 60_000 : 0;
    let lineTime: number | null = null;
    let headerShown = false;
    return logEntries.filter((entry) => {
      if (entry.loggedAt !== undefined) lineTime = entry.loggedAt;
      const inRange = cutoff === 0 || lineTime === null || lineTime >= cutoff;
      if (hidePanelNoise && isPanelNoise(entry.content)) return false;
      const levelMatches = levelFilter === "all" || (levelFilter === "chat" ? isChat(entry.content) : entry.level === levelFilter);
      const shown = inRange && !invalidRegex && matcher(entry.content) && levelMatches;
      // A stack frame stays with its error, and also shows on its own when it matches the search.
      if (entry.continuation) return inRange && !invalidRegex && (headerShown || (searchTerm !== "" && shown));
      headerShown = shown;
      return shown;
    });
  }, [logEntries, searchTerm, levelFilter, regex, sinceMinutes, filterNow, hidePanelNoise]);

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
