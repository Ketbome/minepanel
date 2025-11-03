import { FC, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { Terminal, Send, AlertTriangle, Trash } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useServerCommands } from "@/lib/hooks/useServerCommands";
import Image from "next/image";

interface QuickCommandConsoleProps {
  serverId: string;
  rconPort: string;
  rconPassword: string;
  serverStatus: string;
}

export const QuickCommandConsole: FC<QuickCommandConsoleProps> = ({ serverId, rconPort, rconPassword, serverStatus }) => {
  const { t } = useLanguage();
  const { command, response, executing, executeCommand, setCommand, clearResponse } = useServerCommands(serverId, rconPort, rconPassword);
  const inputRef = useRef<HTMLInputElement>(null);

  const isServerRunning = serverStatus === "running";
  const hasRconConfigured = Boolean(rconPort);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  return (
    <CardContent className="pt-4 pb-4 space-y-4">
      {!hasRconConfigured && (
        <div className="p-3 border rounded-md bg-red-900/30 border-red-700/30 text-red-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium font-minecraft text-xs">{t("rconPortNotConfigured")}</p>
            <p className="text-xs text-red-200/80 mt-1">{t("rconPortNotConfiguredDesc")}</p>
          </div>
        </div>
      )}

      {hasRconConfigured && !isServerRunning && (
        <div className="p-3 border rounded-md bg-amber-900/30 border-amber-700/30 text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium font-minecraft text-xs">{t("serverNotRunning2")}</p>
            <p className="text-xs text-amber-200/80 mt-1">{t("startServerToExecute")}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-gray-300 font-minecraft text-sm mb-1 flex items-center gap-2">
          <Image src="/images/command-block.webp" alt="Commands" width={16} height={16} className="opacity-90" />
          {t("quickCommandConsole")}
        </div>
        <div className="flex gap-2">
          <Input ref={inputRef} value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={handleKeyDown} placeholder={t("enterMinecraftCommand")} disabled={!hasRconConfigured || !isServerRunning || executing} className="flex-1 bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 font-mono text-sm" />
          <Button type="button" onClick={() => executeCommand()} disabled={!hasRconConfigured || !isServerRunning || !command.trim() || executing} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
            {executing ? (
              <>
                <Send className="h-4 w-4 animate-pulse" />
                {t("sending")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("send")}
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 pl-1">{t("pressTabToAutocomplete")}</p>
      </div>

      {response && (
        <div className="space-y-2">
          <div className="text-gray-300 font-minecraft text-sm mb-1 flex items-center gap-2">
            <Image src="/images/redstone.webp" alt="Response" width={16} height={16} className="opacity-90" />
            {t("serverResponse")}
          </div>
          <div className="relative mt-1">
            <div className="absolute top-2 right-2">
              <Button type="button" variant="ghost" size="icon" onClick={clearResponse} className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700/50">
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 bg-gray-950/80 text-emerald-400 border border-gray-700/50 rounded-md min-h-[100px] max-h-[200px] overflow-auto font-mono text-sm whitespace-pre-wrap">{response}</div>
          </div>
        </div>
      )}
    </CardContent>
  );
};
