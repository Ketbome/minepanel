import { useState } from "react";
import { toast } from "sonner";
import { executeServerCommand } from "@/services/docker/fetchs";
import { useLanguage } from "./useLanguage";

export function useServerCommands(serverId: string, rconPort: string, rconPassword: string) {
  const { t } = useLanguage();
  const [command, setCommand] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [executing, setExecuting] = useState<boolean>(false);

  const executeCommand = async (commandToExecute: string = command) => {
    if (!commandToExecute.trim()) {
      toast.error(t("enterACommandToExecute"));
      return false;
    }
    if (!rconPort) {
      toast.error(t("rconPortNotConfigured"));
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
        toast.success(t("commandExecutedSuccessfully"));
        setCommand("");
        return true;
      } else {
        setResponse(result.output);
        toast.error(t("errorExecutingCommand"));
        return false;
      }
    } catch (error) {
      console.error("Error executing command:", error);
      toast.error(t("errorExecutingCommand"));
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
