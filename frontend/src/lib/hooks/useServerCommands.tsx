import { useEffect, useRef, useState } from "react";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { executeServerCommand } from "@/services/docker/fetchs";
import { useLanguage } from "./useLanguage";

export interface CommandEntry {
  command: string;
  output: string;
  success: boolean;
  time: number;
}

export function useServerCommands(serverId: string, rconPort: string, rconPassword: string) {
  const { t } = useLanguage();
  const [command, setCommand] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [executing, setExecuting] = useState<boolean>(false);

  const [history, setHistory] = useState<CommandEntry[]>([]);
  const pending = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    pending.current = false;
    setCommand("");
    setResponse("");
    setHistory([]);
    setExecuting(false);
    return () => { generation.current += 1; };
  }, [serverId]);

  const executeCommand = async (commandToExecute: string = command) => {
    if (pending.current) return false;
    commandToExecute = commandToExecute.trim().replace(/^\//, "").trim();
    if (!commandToExecute) {
      mcToast.error(t("enterACommandToExecute"));
      return false;
    }
    if (!rconPort) {
      mcToast.error(t("rconPortNotConfigured"));
      return false;
    }

    const body = {
      command: commandToExecute,
      rconPort: rconPort,
      rconPassword: rconPassword,
    };

    const requestGeneration = generation.current;
    pending.current = true;
    setExecuting(true);
    try {
      const result = await executeServerCommand(serverId, body);
      if (requestGeneration !== generation.current) return false;
      setHistory((entries) => [...entries, { command: commandToExecute, output: result.output, success: result.success, time: Date.now() }].slice(-50));
      if (result.success) {
        setResponse(result.output);
        mcToast.success(t("commandExecutedSuccessfully"));
        setCommand("");
        return true;
      } else {
        setResponse(result.output);
        mcToast.error(t("errorExecutingCommand"));
        return false;
      }
    } catch (error) {
      if (requestGeneration !== generation.current) return false;
      console.error("Error executing command:", error);
      setResponse(t("errorExecutingCommand"));
      setHistory((entries) => [...entries, { command: commandToExecute, output: t("errorExecutingCommand"), success: false, time: Date.now() }].slice(-50));
      mcToast.error(t("errorExecutingCommand"));
      return false;
    } finally {
      if (requestGeneration === generation.current) {
        pending.current = false;
        setExecuting(false);
      }
    }
  };

  const clearResponse = () => {
    setResponse("");
  };

  const setCommandText = (text: string) => {
    setCommand(text);
  };

  return {
    command,
    response,
    executing,
    executeCommand,
    setCommand: setCommandText,
    clearResponse,
    history,
    clearHistory: () => { setHistory([]); setResponse(""); },
  };
}
