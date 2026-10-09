"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, CircleAlert, History, LoaderCircle, Send, Terminal, Trash, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { useServerCommands } from "@/lib/hooks/useServerCommands";
import { cn } from "@/lib/utils";

interface CommandPreset {
  label: string;
  command: string;
  category: string;
}

interface CommandWorkbenchProps {
  serverId: string;
  rconPort: string;
  rconPassword: string;
  isServerRunning: boolean;
  commands: CommandPreset[];
}

export function CommandWorkbench({ serverId, rconPort, rconPassword, isServerRunning, commands }: CommandWorkbenchProps) {
  const { t } = useLanguage();
  const { command, setCommand, executing, executeCommand, history, clearHistory } = useServerCommands(serverId, rconPort, rconPassword);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const draft = useRef("");
  const available = isServerRunning && Boolean(rconPort);
  const query = command.trim().replace(/^\//, "").toLowerCase();
  const suggestions = query ? commands.filter((entry) => entry.command.toLowerCase().includes(query) || entry.label.toLowerCase().includes(query)).slice(0, 5) : [];
  const showSuggestions = suggesting && suggestions.length > 0 && available && !executing;
  const matches = commands.filter((entry) => `${entry.label} ${entry.command}`.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [history, executing]);

  useEffect(() => {
    if (showSuggestions && selected >= 0) document.getElementById(`${id}-option-${selected}`)?.scrollIntoView({ block: "nearest" });
  }, [id, selected, showSuggestions]);

  const insert = (text: string) => {
    setCommand(text);
    setSuggesting(false);
    setSelected(-1);
    setHistoryIndex(-1);
    inputRef.current?.focus();
  };

  const send = async () => {
    if (!available || executing || !command.trim()) return;
    setSuggesting(false);
    setSelected(-1);
    setHistoryIndex(-1);
    await executeCommand();
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Some IMEs clear isComposing before their confirmation Enter.
    if (event.nativeEvent.keyCode === 229) {
      event.preventDefault();
      return;
    }
    if (executing || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      setSuggesting(false);
      setSelected(-1);
    } else if (showSuggestions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setSelected((current) => event.key === "ArrowDown" ? (current + 1) % suggestions.length : (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (showSuggestions && (event.key === "Tab" && !event.shiftKey || event.key === "Enter" && selected >= 0)) {
      event.preventDefault();
      insert(suggestions[Math.max(0, selected)].command);
    } else if ((event.key === "ArrowUp" || event.key === "ArrowDown") && history.length > 0) {
      event.preventDefault();
      if (historyIndex === -1) draft.current = command;
      const next = event.key === "ArrowUp" ? Math.min(historyIndex + 1, history.length - 1) : Math.max(-1, historyIndex - 1);
      setHistoryIndex(next);
      setCommand(next === -1 ? draft.current : history[history.length - 1 - next].command);
      setSuggesting(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
      <section className="flex min-w-0 flex-col gap-3" aria-label={t("commandConsole")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-gray-400" aria-hidden="true" />{t("consoleHistory")}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => { clearHistory(); setHistoryIndex(-1); }} disabled={!history.length || executing}>
            <Trash aria-hidden="true" />{t("consoleClearHistory")}
          </Button>
        </div>
        <div ref={outputRef} tabIndex={0} role="region" aria-label={t("serverResponse")} className="h-80 overflow-auto border border-gray-700 bg-gray-950 p-4 focus-visible:outline-2 focus-visible:outline-emerald-400 sm:h-96">
          {history.length === 0 && !executing && (
            <div className="flex h-full flex-col items-start justify-center gap-3 text-gray-400">
              <Terminal className="size-6 text-emerald-400" aria-hidden="true" />
              <p className="font-medium text-gray-200">{t("consoleEmpty")}</p>
              <p className="max-w-md text-sm leading-relaxed">{t("consoleEmptyHint")}</p>
            </div>
          )}
          <ol className="flex flex-col gap-5">
            {history.map((entry, index) => (
              <li key={`${entry.time}-${index}`} className="flex min-w-0 flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="pt-1 font-mono text-emerald-400" aria-hidden="true">&gt;</span>
                  <code className="min-w-0 flex-1 whitespace-pre-wrap break-all pt-1 text-sm text-gray-100">{entry.command}</code>
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`${t("consoleReuse")}: ${entry.command}`} title={t("consoleReuse")} disabled={executing || !available} onClick={() => insert(entry.command)}><Undo2 aria-hidden="true" /></Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <time dateTime={new Date(entry.time).toISOString()}>{new Date(entry.time).toLocaleTimeString()}</time>
                  {entry.success ? <Check className="size-3 text-emerald-400" aria-hidden="true" /> : <CircleAlert className="size-3 text-red-400" aria-hidden="true" />}
                  <span>{entry.success ? t("consoleReplyReceived") : t("errorExecutingCommand")}</span>
                </div>
                <pre className={cn("whitespace-pre-wrap break-words font-mono text-sm leading-relaxed", entry.success ? "text-gray-300" : "text-red-300")}>{entry.output || t("consoleNoOutput")}</pre>
              </li>
            ))}
          </ol>
          {executing && <p className="mt-4 flex items-center gap-2 text-sm text-gray-400"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t("sending")}</p>}
        </div>
        <p className="sr-only" role="status">{executing ? t("sending") : history.length ? `${history.at(-1)?.command}: ${history.at(-1)?.output || t("consoleNoOutput")}` : ""}</p>
        <form className="flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <Label htmlFor={`${id}-input`}>{t("sendCommand")}</Label>
          <div className="relative">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id={`${id}-input`} ref={inputRef} value={command} autoComplete="off" spellCheck={false} role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={showSuggestions ? `${id}-suggestions` : undefined} aria-activedescendant={showSuggestions && selected >= 0 ? `${id}-option-${selected}` : undefined} aria-describedby={`${id}-hint`} onKeyDown={onKeyDown} onBlur={() => setSuggesting(false)} onChange={(event) => { setCommand(event.target.value); setSuggesting(true); setSelected(-1); setHistoryIndex(-1); }} placeholder={t("enterMinecraftCommand")} disabled={!available} readOnly={executing} className="min-w-0 flex-1 font-mono text-base" />
              <Button type="submit" variant="minepanel" disabled={!available || executing || !command.trim()}><Send aria-hidden="true" />{executing ? t("sending") : t("send")}</Button>
            </div>
            {showSuggestions && (
              <ul id={`${id}-suggestions`} role="listbox" aria-label={t("quickCommands")} className="absolute bottom-full z-10 mb-2 max-h-60 w-full overflow-auto border border-gray-600 bg-gray-900 shadow-lg">
                {suggestions.map((entry, index) => (
                  <li key={entry.command} id={`${id}-option-${index}`} role="option" aria-selected={selected === index} onMouseDown={(event) => event.preventDefault()} onClick={() => insert(entry.command)} className={cn("flex cursor-pointer flex-col gap-1 p-3 text-sm hover:bg-gray-800", selected === index && "bg-gray-800")}>
                    <code className="break-all text-emerald-400">{entry.command}</code><span className="text-gray-400">{entry.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p id={`${id}-hint`} className="text-xs leading-relaxed text-gray-400">{!rconPort ? t("rconPortNotConfigured") : !isServerRunning ? t("startServerToExecute") : t("consoleKeyboardHint")}</p>
          <p className="text-xs text-gray-500">{t("consoleSessionHint")}</p>
        </form>
      </section>
      <aside className="flex min-w-0 flex-col gap-3" aria-label={t("quickCommands")}>
        <Label htmlFor={`${id}-search`}>{t("consoleFindPreset")}</Label>
        <Input id={`${id}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("consoleSearchHint")} className="text-base" />
        <p className="text-xs leading-relaxed text-gray-400">{t("consolePresetHint")}</p>
        <div className="max-h-96 overflow-auto border-t border-gray-700 xl:max-h-[32rem]">
          {matches.length ? matches.map((entry) => (
            <Button key={entry.command} type="button" variant="ghost" disabled={!available || executing} onClick={() => insert(entry.command)} className="h-auto w-full flex-col items-start gap-1 whitespace-normal border-b border-gray-800 py-3 text-start">
              <span>{entry.label}</span><code className="max-w-full break-all font-mono text-xs text-gray-400">{entry.command}</code>
            </Button>
          )) : <p className="py-6 text-sm text-gray-400">{t("consoleNoMatches")}</p>}
        </div>
      </aside>
    </div>
  );
}
