import type { PropertyCategory } from "./server-properties-model";

export type PropertyType = "boolean" | "int" | "string" | "enum";

export interface PropertyDef {
  key: string;
  category: PropertyCategory;
  type: PropertyType;
  default: string;
  description: string;
  min?: number;
  max?: number;
  options?: string[];
  // First Minecraft version that reads the key, and the first one that no longer does.
  since?: string;
  until?: string;
}

// Every key the vanilla Java server writes to server.properties, with the versions that read it.
// Descriptions are English: the editor shows its translated help where a key has one.
const PROPERTIES: PropertyDef[] = [
  { key: "motd", category: "game", type: "string", default: "A Minecraft Server", description: "Message shown under the server name in the multiplayer list. Supports § colour codes." },
  { key: "max-players", category: "game", type: "int", default: "20", min: 0, max: 2147483647, description: "Maximum number of players that can be online at once." },
  { key: "difficulty", category: "game", type: "enum", default: "easy", options: ["peaceful", "easy", "normal", "hard"], description: "Difficulty of the world." },
  { key: "gamemode", category: "game", type: "enum", default: "survival", options: ["survival", "creative", "adventure", "spectator"], description: "Default game mode for new players." },
  { key: "force-gamemode", category: "game", type: "boolean", default: "false", description: "Force players into the default game mode every time they join." },
  { key: "hardcore", category: "game", type: "boolean", default: "false", description: "Players are set to spectator on death and the difficulty is locked to hard." },
  { key: "pvp", category: "game", type: "boolean", default: "true", description: "Allow players to damage each other. Replaced by a game rule in 1.21.9.", until: "1.21.9" },
  { key: "allow-flight", category: "game", type: "boolean", default: "false", description: "Allow flying in survival (needed by some mods; otherwise flying players are kicked)." },
  { key: "enable-command-block", category: "game", type: "boolean", default: "false", description: "Enable command blocks. Replaced by a game rule in 1.21.9.", until: "1.21.9" },
  { key: "spawn-monsters", category: "game", type: "boolean", default: "true", description: "Hostile mobs spawn. Replaced by a game rule in 1.21.9.", until: "1.21.9" },
  { key: "spawn-protection", category: "game", type: "int", default: "16", min: 0, max: 2147483647, description: "Radius around the world spawn that only operators can modify. 0 disables it." },
  { key: "player-idle-timeout", category: "game", type: "int", default: "0", min: 0, max: 2147483647, description: "Minutes of inactivity before a player is kicked. 0 disables the timeout." },
  { key: "op-permission-level", category: "game", type: "int", default: "4", min: 0, max: 4, description: "Permission level given to operators (1 bypass spawn protection, 2 commands, 3 manage players, 4 all)." },
  { key: "function-permission-level", category: "game", type: "int", default: "2", min: 1, max: 4, description: "Permission level that functions run with.", since: "1.14.4" },
  { key: "allow-nether", category: "game", type: "boolean", default: "true", description: "Allow players to travel to the Nether. Replaced by a game rule in 1.21.9.", until: "1.21.9" },
  { key: "generate-structures", category: "game", type: "boolean", default: "true", description: "Generate villages, strongholds and other structures (new chunks only)." },
  { key: "level-name", category: "game", type: "string", default: "world", description: "Name of the world folder." },
  { key: "level-seed", category: "game", type: "string", default: "", description: "Seed used to generate a new world. Empty picks a random one." },
  { key: "level-type", category: "game", type: "string", default: "minecraft:normal", description: "World generation preset, e.g. minecraft:normal, minecraft:flat, minecraft:large_biomes, minecraft:amplified." },
  { key: "generator-settings", category: "game", type: "string", default: "{}", description: "JSON settings for the flat or custom world generator.", since: "1.8" },
  { key: "max-world-size", category: "game", type: "int", default: "29999984", min: 1, max: 29999984, description: "Maximum world radius in blocks." },
  { key: "view-distance", category: "performance", type: "int", default: "10", min: 3, max: 32, description: "Chunks sent to each player around them. Lower it to save CPU and bandwidth." },
  { key: "simulation-distance", category: "performance", type: "int", default: "10", min: 3, max: 32, description: "Distance in chunks around players where entities and blocks tick.", since: "1.18" },
  { key: "entity-broadcast-range-percentage", category: "performance", type: "int", default: "100", min: 10, max: 1000, description: "Percentage of the default distance at which entities are sent to clients.", since: "1.16" },
  { key: "max-tick-time", category: "performance", type: "int", default: "60000", min: -1, max: Number.MAX_SAFE_INTEGER, description: "Milliseconds a single tick may take before the watchdog stops the server. -1 disables it." },
  { key: "max-chained-neighbor-updates", category: "performance", type: "int", default: "1000000", min: -1, max: 2147483647, description: "Limit on chained neighbour block updates. Negative values disable the limit.", since: "1.19" },
  { key: "network-compression-threshold", category: "performance", type: "int", default: "256", min: -1, max: 2147483647, description: "Packets larger than this many bytes are compressed. -1 disables compression.", since: "1.8" },
  { key: "region-file-compression", category: "performance", type: "enum", default: "deflate", options: ["deflate", "lz4", "none"], description: "Compression used for region files.", since: "1.20.5" },
  { key: "sync-chunk-writes", category: "performance", type: "boolean", default: "true", description: "Write chunks synchronously. Safer against corruption, slightly slower.", since: "1.16" },
  { key: "pause-when-empty-seconds", category: "performance", type: "int", default: "60", min: -1, max: 2147483647, description: "Seconds with no players before the server pauses ticking. -1 disables pausing.", since: "1.21.2" },
  { key: "use-native-transport", category: "performance", type: "boolean", default: "true", description: "Use optimised packet handling on Linux." },
  { key: "server-ip", category: "network", type: "string", default: "", description: "IP the server binds to. Leave empty in Docker." },
  { key: "server-port", category: "network", type: "int", default: "25565", min: 1, max: 65534, description: "Port the server listens on. In Docker this is the container port; change the published port in the Network tab." },
  { key: "enable-status", category: "network", type: "boolean", default: "true", description: "Respond to the multiplayer list ping.", since: "1.16" },
  { key: "hide-online-players", category: "network", type: "boolean", default: "false", description: "Hide the player list in the multiplayer list.", since: "1.18" },
  { key: "enable-query", category: "network", type: "boolean", default: "false", description: "Enable the GameSpy4 query protocol." },
  { key: "query.port", category: "network", type: "int", default: "25565", min: 1, max: 65534, description: "UDP port for the query protocol." },
  { key: "accepts-transfers", category: "network", type: "boolean", default: "false", description: "Accept players transferred from other servers.", since: "1.20.5" },
  { key: "log-ips", category: "network", type: "boolean", default: "true", description: "Log player IP addresses in the console.", since: "1.20.2" },
  { key: "rate-limit", category: "network", type: "int", default: "0", min: 0, max: 2147483647, description: "Packets per second a client may send before being kicked. 0 disables the limit.", since: "1.16.2" },
  { key: "chat-spam-threshold-seconds", category: "other", type: "int", default: "10", min: 0, max: 2147483647, description: "Kicks players who send too many chat messages; the counter drops once per tick. 0 disables the kick.", since: "26.2" },
  { key: "command-spam-threshold-seconds", category: "other", type: "int", default: "10", min: 0, max: 2147483647, description: "Kicks players who send too many commands; the counter drops once per tick. 0 disables the kick.", since: "26.2" },
  { key: "enable-code-of-conduct", category: "other", type: "boolean", default: "false", description: "Show the code of conduct from the codeofconduct folder (<language_code>.txt files) when players join.", since: "1.21.9" },
  { key: "allowed-connection-ids", category: "other", type: "string", default: "", description: "Only connections whose id (text before the first @ in the address) is listed are accepted. Comma-separated.", since: "26.4" },
  { key: "enable-legacy-status", category: "network", type: "boolean", default: "true", description: "Show the server as online to pre-1.7 clients.", since: "26.4" },
  { key: "status-contact-details", category: "network", type: "string", default: "", description: "Human-readable way to contact the server owners. Not shown to players.", since: "26.4" },
  { key: "management-server-enabled", category: "network", type: "boolean", default: "false", description: "Enable the Minecraft Server Management Protocol.", since: "1.21.9" },
  { key: "management-server-host", category: "network", type: "string", default: "localhost", description: "Host the management protocol listens on.", since: "1.21.9" },
  { key: "management-server-port", category: "network", type: "int", default: "0", min: 0, max: 65535, description: "Port the management protocol listens on. 0 picks a free port.", since: "1.21.9" },
  { key: "management-server-secret", category: "network", type: "string", default: "", description: "Secret clients send in the Authorization header: 40 letters or digits. Generated when empty.", since: "1.21.9" },
  { key: "management-server-tls-enabled", category: "network", type: "boolean", default: "true", description: "Use TLS for the management protocol. The server will not start without a keystore.", since: "1.21.9" },
  { key: "management-server-tls-keystore", category: "network", type: "string", default: "", description: "Path to the TLS keystore file.", since: "1.21.9" },
  { key: "management-server-tls-keystore-password", category: "network", type: "string", default: "", description: "Password of the TLS keystore.", since: "1.21.9" },
  { key: "management-server-allowed-origins", category: "network", type: "string", default: "", description: "Comma-separated browser origins allowed to connect to the management protocol.", since: "1.21.9" },
  { key: "status-heartbeat-interval", category: "network", type: "int", default: "0", min: 0, max: 2147483647, description: "Seconds between heartbeat notifications sent to management clients. 0 disables them.", since: "1.21.9" },
  { key: "online-mode", category: "other", type: "boolean", default: "true", description: "Verify players with Mojang. Turn off only behind a proxy or for offline play." },
  { key: "white-list", category: "other", type: "boolean", default: "false", description: "Only whitelisted players can join." },
  { key: "enforce-whitelist", category: "other", type: "boolean", default: "false", description: "Kick non-whitelisted players when the whitelist is reloaded." },
  { key: "enforce-secure-profile", category: "other", type: "boolean", default: "true", description: "Require players to have a Mojang-signed public key for chat.", since: "1.19" },
  { key: "prevent-proxy-connections", category: "other", type: "boolean", default: "false", description: "Kick players whose IP looks like a VPN or proxy.", since: "1.11" },
  { key: "broadcast-console-to-ops", category: "other", type: "boolean", default: "true", description: "Send console command output to online operators." },
  { key: "bug-report-link", category: "other", type: "string", default: "", description: "URL shown on crash screens for reporting bugs.", since: "1.21" },
  { key: "resource-pack", category: "game", type: "string", default: "", description: "Direct download URL of the server resource pack." },
  { key: "resource-pack-sha1", category: "game", type: "string", default: "", description: "SHA-1 of the resource pack, 40 hex characters." },
  { key: "resource-pack-id", category: "game", type: "string", default: "", description: "UUID that identifies the resource pack.", since: "1.20.3" },
  { key: "resource-pack-prompt", category: "game", type: "string", default: "", description: "Message shown to players when they are asked to accept the pack.", since: "1.17" },
  { key: "require-resource-pack", category: "game", type: "boolean", default: "false", description: "Kick players who decline the resource pack.", since: "1.17" },
  { key: "initial-enabled-packs", category: "game", type: "string", default: "vanilla", description: "Comma-separated data packs enabled when the world is created.", since: "1.19.3" },
  { key: "initial-disabled-packs", category: "game", type: "string", default: "", description: "Comma-separated data packs disabled when the world is created.", since: "1.19.3" },
  { key: "text-filtering-config", category: "game", type: "string", default: "", description: "Chat filtering configuration.", since: "1.16.4" },
  { key: "text-filtering-version", category: "game", type: "int", default: "0", min: 0, max: 1, description: "Chat filtering version.", since: "1.21.2" },
  { key: "enable-rcon", category: "network", type: "boolean", default: "false", description: "Enable remote console. The panel needs it for commands, tasks and player tools." },
  { key: "rcon.port", category: "network", type: "int", default: "25575", min: 1, max: 65535, description: "Port RCON listens on." },
  { key: "rcon.password", category: "network", type: "string", default: "", description: "RCON password. Managed by the panel." },
  { key: "broadcast-rcon-to-ops", category: "network", type: "boolean", default: "true", description: "Send RCON command output to online operators." },
  { key: "enable-jmx-monitoring", category: "network", type: "boolean", default: "false", description: "Expose JMX tick-time beans.", since: "1.16" },
  { key: "max-build-height", category: "game", type: "int", default: "256", min: 1, max: 2147483647, description: "Highest block players can build at." },
  { key: "snooper-enabled", category: "other", type: "boolean", default: "true", description: "Send anonymous usage data to Mojang." },
  { key: "previews-chat", category: "other", type: "boolean", default: "false", description: "Enable chat previews." },
  { key: "spawn-animals", category: "game", type: "boolean", default: "true", description: "Animals spawn." },
  { key: "spawn-npcs", category: "game", type: "boolean", default: "true", description: "Villagers spawn." },
];

// From the Minecraft Wiki history of server.properties. A key missing here exists in every release.
const SINCE: Record<string, string> = {
  "generator-settings": "1.8", "network-compression-threshold": "1.8", "prevent-proxy-connections": "1.11", "function-permission-level": "1.14.4",
  "sync-chunk-writes": "1.16", "enable-jmx-monitoring": "1.16", "enable-status": "1.16", "entity-broadcast-range-percentage": "1.16",
  "rate-limit": "1.16.2", "text-filtering-config": "1.16.4", "require-resource-pack": "1.17", "resource-pack-prompt": "1.17",
  "simulation-distance": "1.18", "hide-online-players": "1.18", "max-chained-neighbor-updates": "1.19", "enforce-secure-profile": "1.19",
  "initial-enabled-packs": "1.19.3", "initial-disabled-packs": "1.19.3", "log-ips": "1.20.2", "resource-pack-id": "1.20.3",
  "accepts-transfers": "1.20.5", "region-file-compression": "1.20.5", "bug-report-link": "1.21", "pause-when-empty-seconds": "1.21.2",
  "text-filtering-version": "1.21.2", "enable-code-of-conduct": "1.21.9", "management-server-enabled": "1.21.9", "management-server-host": "1.21.9",
  "management-server-port": "1.21.9", "status-heartbeat-interval": "1.21.9", "management-server-secret": "1.21.9", "management-server-tls-enabled": "1.21.9",
  "management-server-tls-keystore": "1.21.9", "management-server-tls-keystore-password": "1.21.9",
  // Not in the wiki history; it is in the current default file, so it is dated with the rest of the management protocol.
  "management-server-allowed-origins": "1.21.9",
  "chat-spam-threshold-seconds": "26.2", "command-spam-threshold-seconds": "26.2",
  "previews-chat": "1.19",
  "allowed-connection-ids": "26.4", "enable-legacy-status": "26.4", "status-contact-details": "26.4",
};
const UNTIL: Record<string, string> = { "max-build-height": "1.17", "snooper-enabled": "1.18", "previews-chat": "1.19.3", "spawn-animals": "1.21.2", "spawn-npcs": "1.21.2", pvp: "1.21.9", "allow-nether": "1.21.9", "enable-command-block": "1.21.9", "spawn-monsters": "1.21.9" };


export const SERVER_PROPERTIES: PropertyDef[] = PROPERTIES.map((p) => ({ ...p, since: SINCE[p.key], until: UNTIL[p.key] }));

export const PROPERTY_BY_KEY = new Map(SERVER_PROPERTIES.map((p) => [p.key, p]));

// Newest release at the time of writing (Mojang version manifest). Update it, and SINCE, when a release adds keys.
const LATEST_RELEASE = "26.3";

// "1.21.4", "26.1.2", "26.4-snapshot-3" and "1.21.4-rc1" compare numerically. LATEST, an empty value or a
// modpack id carry no version, so they count as the newest release; SNAPSHOT counts as newer than any.
function parseVersion(version?: string): number[] | null {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(version ?? "");
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
}

const compare = (a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// Does this version read the key? Used to decide which missing keys to offer.
export function isAvailable(def: PropertyDef, version?: string): boolean {
  const v = parseVersion(version) ?? (/^snapshot$/i.test(version ?? "") ? [Infinity, 0, 0] : parseVersion(LATEST_RELEASE)!);
  return (!def.since || compare(v, parseVersion(def.since)!) >= 0) && (!def.until || compare(v, parseVersion(def.until)!) < 0);
}

// Should a key already in the file be flagged? Without an explicit version only keys the newest
// release dropped are, so a stale LATEST_RELEASE never mislabels a key a newer release added.
export function isIgnored(def: PropertyDef, version?: string): boolean {
  return parseVersion(version) ? !isAvailable(def, version) : !!def.until;
}

// Same checks as the server: type, enum and range. Unknown keys are never an error.
export function isValidValue(def: PropertyDef | undefined, value: string): boolean {
  if (!def) return true;
  if (def.type === "boolean") return value === "true" || value === "false";
  if (def.type === "enum") return def.options!.includes(value);
  if (def.type === "int") return /^-?\d+$/.test(value) && Number(value) >= def.min! && Number(value) <= def.max!;
  return true;
}
