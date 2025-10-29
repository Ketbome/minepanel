import { FC, memo } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Play, Pause, RefreshCcw } from "lucide-react";

interface LogsControlsProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  levelFilter: string;
  setLevelFilter: (value: string) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  lineCount: number;
  setLogLines: (value: number) => void;
  isRealTime: boolean;
  toggleRealTime: () => void;
  loading: boolean;
  handleRefreshLogs: () => void | Promise<void>;
}

const LogsControls: FC<LogsControlsProps> = ({ searchTerm, setSearchTerm, levelFilter, setLevelFilter, autoScroll, setAutoScroll, lineCount, setLogLines, isRealTime, toggleRealTime, loading, handleRefreshLogs }) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <div className="lg:col-span-2 space-y-2 px-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder={t("searchInLogs")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-800/70 border-gray-700/50 text-gray-200 placeholder-gray-400 focus:border-emerald-500/50" />
          </div>
          <div className="relative">
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-10 appearance-none rounded-md border border-gray-700/50 bg-gray-800/70 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 pr-8">
              <option value="all">{t("allLevels")}</option>
              <option value="error">{t("onlyErrors")}</option>
              <option value="warn">{t("onlyWarnings")}</option>
              <option value="info">{t("onlyInfo")}</option>
              <option value="debug">{t("onlyDebug")}</option>
            </select>
            <Filter className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="rounded border-gray-600 bg-gray-800" />
            {t("autoScroll")}
          </label>
          <div className="flex items-center gap-2">
            <span>{t("lines")}:</span>
            <select value={lineCount} onChange={(e) => setLogLines(Number(e.target.value))} className="h-8 appearance-none rounded border border-gray-700/50 bg-gray-800/70 text-gray-200 px-2 text-xs">
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={toggleRealTime} variant={isRealTime ? "default" : "outline"} className={`gap-2 font-minecraft ${isRealTime ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-700/50 border-gray-600/50 hover:bg-gray-600/50 text-gray-300"}`}>
          {isRealTime ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRealTime ? t("pause") : t("resume")}
        </Button>
        <Button type="button" size="sm" onClick={handleRefreshLogs} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
          {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default memo(LogsControls);
