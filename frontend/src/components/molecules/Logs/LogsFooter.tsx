import { FC, memo } from "react";
import { LogEntry, LogsError } from "../Tabs/LogsTab";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { CardContent } from "@/components/ui/card";
import { Clock, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogsFooterProps {
  error: LogsError | null;
  hasErrors: boolean;
  isRealTime: boolean;
  lastUpdate: Date | null;
  filteredLogEntries: LogEntry[];
  logEntries: LogEntry[];
  loadingResources: boolean;
  fetchServerResources: () => void | Promise<void>;
  resourcesError: string | null;
}

const LogsFooter: FC<LogsFooterProps> = ({ error, hasErrors, isRealTime, lastUpdate, filteredLogEntries, logEntries, loadingResources, fetchServerResources, resourcesError }) => {
  const { t } = useLanguage();
  return (
    <CardContent className="flex justify-between mt-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <div className={`w-4 h-4 rounded-full mr-2 ${error ? "bg-red-500" : hasErrors ? "bg-yellow-500 animate-pulse" : isRealTime ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}></div>
          <span className="text-xs text-gray-400 font-minecraft">{error ? t("disconnected") : hasErrors ? t("withErrors") : isRealTime ? t("realTimeActive") : t("realTimePaused")}</span>
        </div>
        {lastUpdate && !error && (
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>{lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}
        <div className="text-xs text-gray-500">
          {t("showing")} {filteredLogEntries.length} {t("of")} {logEntries.length} {t("entries")}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={fetchServerResources} disabled={loadingResources} variant="outline" className={`gap-2 font-minecraft ${resourcesError ? "bg-red-600/20 border-red-600/30 hover:bg-red-600/30 text-red-400" : "bg-blue-600/20 border-blue-600/30 hover:bg-blue-600/30 text-blue-400"}`}>
          {loadingResources ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          {t("resources")}
        </Button>
      </div>
    </CardContent>
  );
};

export default memo(LogsFooter);
