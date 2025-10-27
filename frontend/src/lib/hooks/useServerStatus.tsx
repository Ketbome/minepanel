import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getServerStatus as apiGetServerStatus, startServer as apiStartServer, stopServer as apiStopServer } from "@/services/docker/fetchs";
import { useLanguage } from "@/lib/hooks/useLanguage";

export function useServerStatus(serverId: string) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<string>("unknown");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const translateMessage = (message: string): string => {
    const knownKeys = ["serverStarted", "serverStopped", "connectionError", "unexpectedError", "SERVER_START_ERROR", "SERVER_STOP_ERROR"];
    if (knownKeys.includes(message)) {
      return t(message as "serverStarted" | "serverStopped" | "connectionError" | "unexpectedError" | "SERVER_START_ERROR" | "SERVER_STOP_ERROR");
    }
    return message;
  };

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiGetServerStatus(serverId);
      setStatus(data.status);
      return data.status;
    } catch (error) {
      console.error("Error fetching server status:", error);
      return "error";
    }
  }, [serverId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const startServer = async () => {
    setIsProcessingAction(true);
    try {
      const result = await apiStartServer(serverId);
      if (result.success) {
        toast.success(t("serverStarted"));
        setTimeout(fetchStatus, 3000);
        return true;
      } else {
        throw new Error(translateMessage(result.message || "SERVER_START_ERROR"));
      }
    } catch (error) {
      console.error("Error starting server:", error);
      const errorMessage = error instanceof Error ? translateMessage(error.message) : t("SERVER_START_ERROR");
      toast.error(errorMessage);
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  };

  const stopServer = async () => {
    setIsProcessingAction(true);
    try {
      const result = await apiStopServer(serverId);
      if (result.success) {
        toast.success(t("serverStopped"));
        fetchStatus();
        return true;
      } else {
        throw new Error(translateMessage(result.message || "SERVER_STOP_ERROR"));
      }
    } catch (error) {
      console.error("Error stopping server:", error);
      const errorMessage = error instanceof Error ? translateMessage(error.message) : t("SERVER_STOP_ERROR");
      toast.error(errorMessage);
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  };

  return {
    status,
    isProcessingAction,
    fetchStatus,
    startServer,
    stopServer,
  };
}
