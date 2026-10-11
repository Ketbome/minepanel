export type PropertyEntry = { index: number; key: string; value: string };
export type PropertyCategory = "game" | "network" | "performance" | "other";
export type PropertyChange = { label: string; before: string; after: string };

const PROPERTY_LINE = /^([A-Za-z][A-Za-z0-9_.-]*)\s*([=:])\s*(.*)$/;
const SECRET_KEY = /(?:password|secret|token|api-key)/i;

export const PANEL_KEYS = new Set([
  "motd", "server-name", "max-players", "difficulty", "gamemode", "pvp", "online-mode", "white-list",
  "enforce-whitelist", "enable-command-block", "allow-flight", "view-distance", "simulation-distance",
  "player-idle-timeout", "spawn-protection", "op-permission-level", "level-name", "level-seed",
  "spawn-animals", "spawn-monsters", "spawn-npcs", "generate-structures", "allow-nether",
  "hardcore", "entity-broadcast-range-percentage", "server-port", "server-portv6",
  "allow-cheats", "tick-distance", "max-threads", "texturepack-required", "default-player-permission-level",
  "level-type", "enable-rcon", "rcon.port", "rcon.password", "broadcast-rcon-to-ops",
  "prevent-proxy-connections",
]);

export function parseProperties(content: string): PropertyEntry[] {
  return content.split(/\r?\n/).flatMap((line, index) => {
    const match = PROPERTY_LINE.exec(line);
    return match ? [{ index, key: match[1], value: match[3] }] : [];
  });
}

export function replacePropertyValue(content: string, index: number, value: string): string {
  const ending = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const line = lines[index];
  const match = line && PROPERTY_LINE.exec(line);
  if (!match) return content;
  lines[index] = `${line.slice(0, line.length - match[3].length)}${value}`;
  return lines.join(ending);
}

export function appendProperty(content: string, key: string, value: string): string {
  const ending = content.includes("\r\n") ? "\r\n" : "\n";
  return `${content.replace(/(\r?\n)*$/, "")}${content ? ending : ""}${key}=${value}${ending}`;
}

export function propertyCategory(key: string): PropertyCategory {
  if (/network|compression|rcon|query|port|server-ip|proxy/.test(key)) return "network";
  if (/tick|distance|thread|chunk|entity|performance/.test(key)) return "performance";
  if (/world|level|spawn|resource-pack|game|difficulty|player|mob/.test(key)) return "game";
  return "other";
}

export function managedTab(key: string): "game" | "access" | "network" {
  if (/port|proxy/.test(key)) return "network";
  if (/rcon|whitelist|white-list|online-mode|op-permission|allow-flight|command-block/.test(key)) return "access";
  return "game";
}

export function describePropertyChanges(before: string, after: string): PropertyChange[] {
  const oldLines = before.split(/\r?\n/);
  const newLines = after.split(/\r?\n/);
  const changes: PropertyChange[] = [];
  for (let index = 0; index < Math.max(oldLines.length, newLines.length); index++) {
    const oldLine = oldLines[index] ?? "";
    const newLine = newLines[index] ?? "";
    if (oldLine === newLine) continue;
    const oldMatch = PROPERTY_LINE.exec(oldLine);
    const newMatch = PROPERTY_LINE.exec(newLine);
    const sameKey = oldMatch && newMatch && oldMatch[1] === newMatch[1];
    const key = sameKey ? oldMatch[1] : `#${index + 1}`;
    const masked = SECRET_KEY.test(key) || SECRET_KEY.test(oldMatch?.[1] ?? "") || SECRET_KEY.test(newMatch?.[1] ?? "");
    changes.push({
      label: key,
      before: masked ? "••••••" : sameKey ? oldMatch[3] : oldLine,
      after: masked ? "••••••" : sameKey ? newMatch[3] : newLine,
    });
  }
  return changes;
}
