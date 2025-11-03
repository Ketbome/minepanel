import { FC, useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { Terminal, Send, Loader2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useServerCommands } from "@/lib/hooks/useServerCommands";

interface QuickCommandConsoleProps {
  serverId: string;
  rconPort: string;
  rconPassword: string;
  serverStatus: string;
}

export const QuickCommandConsole: FC<QuickCommandConsoleProps> = ({ serverId, rconPort, rconPassword, serverStatus }) => {
  const { t } = useLanguage();
  const { command, response, executing, executeCommand, setCommand } = useServerCommands(serverId, rconPort, rconPassword);
  const inputRef = useRef<HTMLInputElement>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const isServerRunning = serverStatus === "running";

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (command.trim()) {
        setCommandHistory((prev) => [...prev, command]);
        setHistoryIndex(-1);
        executeCommand();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const handleExecuteCommand = () => {
    if (command.trim()) {
      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);
      executeCommand();
    }
  };

  return (
    <CardContent className="pt-4 pb-4">
      <div className="border border-gray-700/50 rounded-md bg-gray-950/60 overflow-hidden">
        <div className="bg-gray-800/80 px-3 py-2 border-b border-gray-700/50 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-minecraft text-emerald-400">{t("quickCommandConsole")}</span>
        </div>

        {!isServerRunning && (
          <div className="p-3 bg-amber-900/20 border-b border-amber-700/30 text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs font-minecraft">{t("serverNotRunning2")}</p>
          </div>
        )}

        {response && (
          <div className="p-3 border-b border-gray-700/50 bg-gray-900/60">
            <div className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">{response}</div>
          </div>
        )}

        <div className="p-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input ref={inputRef} type="text" value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={handleKeyDown} placeholder={isServerRunning ? t("enterCommand") : t("serverMustBeRunning")} disabled={!isServerRunning || executing} className="bg-gray-800/70 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 text-sm font-mono pr-20" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-minecraft">{t("pressEnter")}</div>
            </div>
            <Button onClick={handleExecuteCommand} disabled={!isServerRunning || executing || !command.trim()} size="sm" className="bg-emerald-600/80 hover:bg-emerald-600 text-white font-minecraft px-3">
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  {t("send")}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-minecraft">{t("useArrowKeysHistory")}</p>
        </div>
      </div>
    </CardContent>
  );
};
