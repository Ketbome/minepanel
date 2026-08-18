// Java requirements per Minecraft version (itzg/minecraft-server tags)
export const getSuggestedJavaImage = (mcVersion: string): string => {
  if (!mcVersion || mcVersion.toLowerCase() === "latest") return "latest";
  const [major, minor, patch] = mcVersion.split(".").map(Number);
  if (major !== 1 || Number.isNaN(minor)) return "latest";
  if (minor <= 16) return "java8";
  if (minor < 20 || (minor === 20 && (patch || 0) <= 4)) return "java17";
  return "java21";
};

// CurseForge mixes Minecraft versions and loader names in the same list.
export const findMinecraftVersion = (gameVersions?: string[]): string | undefined =>
  gameVersions?.find((version) => /^\d+\.\d+(\.\d+)?$/.test(version.trim()));
