// Containers run with a TTY, so modded consoles (NeoForge/Forge) redraw their ">" prompt around
// every line with cursor and erase codes ("ESC[K"). Those and stray control characters go;
// colour codes (ESC[...m) stay for AnsiText.
export const cleanConsoleLine = (line: string): string =>
  line
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-ln-~]/g, "")
    .replace(/\x1b[=>]/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1a\x1c-\x1f\x7f]/g, "")
    .replace(/^>[. \t]*(?=\S)/, "");

export const stripColors = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, "");

export interface LogParts {
  time: string;
  thread: string;
  level: string;
  source?: string;
  message: string;
}

// Vanilla/Fabric "[12:00:00] [Server thread/INFO]: msg", Forge/NeoForge add "[minecraft/ServerLevel]",
// Paper "[12:00:00 INFO]: msg".
const THREAD_LINE = /^\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+?)\/([A-Z]+)\](?: \[([^\]]+)\])?:? ?(.*)$/;
const PAPER_LINE = /^\[(\d{2}:\d{2}:\d{2}) ([A-Z]+)\]:? ?(.*)$/;

export const parseLogLine = (content: string): LogParts | null => {
  const plain = stripColors(content);
  const thread = THREAD_LINE.exec(plain);
  if (thread) return { time: thread[1], thread: thread[2], level: thread[3], source: thread[4], message: thread[5] };
  const paper = PAPER_LINE.exec(plain);
  return paper ? { time: paper[1], thread: "", level: paper[2], message: paper[3] } : null;
};

export const levelOf = (level: string): "info" | "warn" | "error" | "debug" => {
  if (/^(ERROR|FATAL|SEVERE)$/.test(level)) return "error";
  if (/^WARN(ING)?$/.test(level)) return "warn";
  if (/^(DEBUG|TRACE)$/.test(level)) return "debug";
  return "info";
};

// "minecraft/ServerLevel" -> "ServerLevel", "net.minecraft.server.MinecraftServer" -> "MinecraftServer".
export const shortSource = (source?: string): string | undefined => source?.split(/[/.]/).pop();

// Every RCON command the panel sends (console, players tab, TPS sampling) logs two of these.
const PANEL_NOISE = /Thread RCON Client \S+ (started|shutting down)$/;
export const isPanelNoise = (content: string): boolean => PANEL_NOISE.test(stripColors(content).trim());

// "<Steve> hi", "[Not Secure] <Steve> hi", and /say from RCON or the console.
const CHAT = /^(?:\[Not Secure\] )?(?:<[^>]{1,40}>|\[(?:Rcon|Server)\]) /;
export const isChat = (content: string): boolean => CHAT.test(parseLogLine(content)?.message ?? stripColors(content));

// What identifies a line for "repeated" purposes: its text without the time.
export const repeatKey = (content: string): string => {
  const parts = parseLogLine(content);
  return parts ? `${parts.level}|${parts.source ?? parts.thread}|${parts.message}` : stripColors(content);
};

// Lines with no "[12:00:00]" header of their own that belong to the line before: stack frames,
// "Caused by:", "... 12 more", and the exception line under an error.
const TRACE_LINE = /^(?:\s+\S|\s*at [\w$.<>/]+\(|\s*\.\.\. \d+ more|Caused by: |Suppressed: )/;
const EXCEPTION_LINE = /^[a-z][\w$]*(?:\.[\w$]+)+(?:Exception|Error|Throwable)\b/;
export const isContinuation = (raw: string): boolean => TRACE_LINE.test(raw) || EXCEPTION_LINE.test(raw.trim());

// Lines worth spotting at a glance in a busy log.
export const lineTone = (content: string): "join" | "leave" | "ready" | null => {
  const message = parseLogLine(content)?.message ?? stripColors(content);
  if (/^\w{2,16} joined the game$/.test(message)) return "join";
  if (/^\w{2,16} left the game$/.test(message)) return "leave";
  if (/^Done \([\d.,]+s\)!/.test(message)) return "ready";
  return null;
};

// The search box as a pattern to highlight; null when empty or not a valid regex.
export const highlightPattern = (term: string, regex: boolean): RegExp | null => {
  if (!term) return null;
  try {
    return new RegExp(regex ? term : term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  } catch {
    return null;
  }
};
