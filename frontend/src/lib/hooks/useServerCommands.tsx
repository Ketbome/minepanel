import { useState } from "react";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { executeServerCommand } from "@/services/docker/fetchs";
import { useLanguage } from "./useLanguage";

export function useServerCommands(serverId: string, rconPort: string, rconPassword: string) {
  const { t } = useLanguage();
  const [command, setCommand] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [executing, setExecuting] = useState<boolean>(false);

  const executeCommand = async (commandToExecute: string = command) => {
    if (!commandToExecute.trim()) {
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

    setExecuting(true);
    try {
      const result = await executeServerCommand(serverId, body);
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
      console.error("Error executing command:", error);
      mcToast.error(t("errorExecutingCommand"));
      return false;
    } finally {
      setExecuting(false);
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
  };
}
