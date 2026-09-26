const MS_PER_TICK = 50;

export const formatPlayTime = (ticks: number): string => formatDuration(ticks * MS_PER_TICK);

export const formatDistance = (cm: number): string => {
  const meters = cm / 100;
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
};

// "minecraft:diamond_pickaxe" -> "Diamond Pickaxe"; "minecraft:story/mine_stone" -> "Mine Stone"
export const humanizeId = (id: string): string => {
  const name = id.split(":").pop()?.split("/").pop() ?? id;
  return name
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
};

export const idNamespace = (id: string): string => id.split(":").pop()?.split("/")[0] ?? "";

export const formatDimension = (dimension: string): string => humanizeId(dimension.replace("the_", ""));

export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};
