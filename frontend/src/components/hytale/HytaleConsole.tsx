"use client";

import { FC, useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { HytaleServerStatus } from "@/lib/types/hytale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, Send, Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface HytaleConsoleProps {
  serverId: string;
  serverStatus: HytaleServerStatus;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export const HytaleConsole: FC<HytaleConsoleProps> = ({ serverId, serverStatus }) => {
  const { t } = useLanguage();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8091";

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (serverStatus !== "running") {
      setError("Server must be running to use console");
      return;
    }

    setConnectionStatus("connecting");
    setError(null);

    const newSocket = io(`${backendUrl}/hytale-console`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      
      // Attach to server
      newSocket.emit("attach", { serverId });
    });

    newSocket.on("attached", ({ serverId: attachedId }) => {
      console.log(`Attached to server: ${attachedId}`);
      setOutput((prev) => [...prev, `[System] Connected to ${attachedId}`]);
    });

    newSocket.on("initial-logs", ({ logs }) => {
      if (logs) {
        const lines = logs.split("\n").filter((l: string) => l.trim());
        setOutput((prev) => [...prev, ...lines]);
      }
    });

    newSocket.on("output", ({ data }) => {
      if (data) {
        const lines = data.split("\n").filter((l: string) => l.trim());
        setOutput((prev) => [...prev, ...lines]);
      }
    });

    newSocket.on("error", ({ message }) => {
      console.error("WebSocket error:", message);
      setError(message);
      setOutput((prev) => [...prev, `[Error] ${message}`]);
    });

    newSocket.on("detached", ({ serverId: detachedId }) => {
      console.log(`Detached from server: ${detachedId}`);
      setOutput((prev) => [...prev, `[System] Disconnected from ${detachedId}`]);
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setConnectionStatus("disconnected");
    });

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setConnectionStatus("error");
      setError("Failed to connect to server");
    });

    setSocket(newSocket);
  }, [serverId, serverStatus, backendUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.emit("detach");
      socket.disconnect();
      setSocket(null);
      setConnectionStatus("disconnected");
    }
  }, [socket]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output]);

  // Send command
  const sendCommand = () => {
    if (!input.trim() || !socket || connectionStatus !== "connected") return;

    socket.emit("input", { input: input.trim() });
    setOutput((prev) => [...prev, `> ${input}`]);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendCommand();
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-400" />;
      case "connecting":
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case "connected":
        return t("connected");
      case "connecting":
        return t("connecting");
      case "error":
        return t("connectionError");
      default:
        return t("disconnected");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-purple-400" />
          <span className="text-white font-medium">{t("interactiveConsole")}</span>
          <div className="flex items-center gap-2 text-sm">
            {getConnectionIcon()}
            <span
              className={
                connectionStatus === "connected"
                  ? "text-green-400"
                  : connectionStatus === "error"
                  ? "text-red-400"
                  : "text-gray-400"
              }
            >
              {getConnectionText()}
            </span>
          </div>
        </div>

        {connectionStatus === "connected" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
            className="border-red-600/50 text-red-400 hover:bg-red-900/20"
          >
            {t("disconnect")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={connect}
            disabled={connectionStatus === "connecting" || serverStatus !== "running"}
            className="border-purple-600/50 text-purple-400 hover:bg-purple-900/20"
          >
            {connectionStatus === "connecting" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t("connect")}
          </Button>
        )}
      </div>

      {/* Server status warning */}
      {serverStatus !== "running" && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 flex items-center gap-2 text-yellow-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          {t("serverMustBeRunning")}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Console output */}
      <div className="bg-gray-950 rounded-lg border border-gray-700/40 h-[350px] overflow-auto font-mono text-sm">
        <div className="p-4 space-y-0.5">
          {output.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {connectionStatus === "connected"
                ? t("waitingForOutput")
                : t("connectToSeeOutput")}
            </p>
          ) : (
            output.map((line, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap break-all ${
                  line.startsWith("[Error]")
                    ? "text-red-400"
                    : line.startsWith("[System]")
                    ? "text-blue-400"
                    : line.startsWith(">")
                    ? "text-green-400"
                    : "text-gray-300"
                }`}
              >
                {line}
              </div>
            ))
          )}
          <div ref={outputEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("typeCommand")}
          disabled={connectionStatus !== "connected"}
          className="bg-gray-800 border-gray-600 text-white font-mono flex-1"
        />
        <Button
          onClick={sendCommand}
          disabled={connectionStatus !== "connected" || !input.trim()}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
