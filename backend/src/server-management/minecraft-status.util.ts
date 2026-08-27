export interface MinecraftStatusProbe {
  playersOnline: number;
  playersMax: number;
  version: string | null;
}

// mc-monitor prints `key=value` pairs whose order and set of keys vary between
// subcommands and versions, so each field is read independently.
export function parseMinecraftStatus(output: string): MinecraftStatusProbe | null {
  const online = /(?:^|\s)online=(\d+)/.exec(output);
  const max = /(?:^|\s)max=(\d+)/.exec(output);
  if (!online || !max) {
    return null;
  }

  // A version name can contain spaces ("Paper 1.21.4"), so it runs until the next key.
  const version = /(?:^|\s)version=(.*?)(?=\s+[a-zA-Z_]+=|$)/m.exec(output);
  const versionName = version?.[1].trim();

  return {
    playersOnline: Number.parseInt(online[1], 10),
    playersMax: Number.parseInt(max[1], 10),
    version: versionName ? versionName : null,
  };
}
