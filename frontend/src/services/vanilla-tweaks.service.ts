import api from "./axios.service";

export interface VanillaTweaksShare {
  code: string;
  type: "datapacks" | "craftingtweaks" | "resourcepacks";
  version: string;
  packs: Record<string, string[]>;
}

export const getVanillaTweaksShare = async (code: string): Promise<VanillaTweaksShare> => (await api.get(`/vanilla-tweaks/${encodeURIComponent(code)}`)).data;

/** Accepts a bare code or a share link (https://vanillatweaks.net/share#MGr52E). */
export const parseVanillaTweaksCode = (input: string): string | null => {
  const code = input.trim().split("#").pop()?.trim() ?? "";
  return /^[A-Za-z0-9]{3,16}$/.test(code) ? code : null;
};

/** Vanilla Tweaks keys its packs by major version: 1.21.4 -> "1.21", 26.2.1 -> "26.2". */
export const vanillaTweaksVersion = (minecraftVersion: string | undefined): string | null => /^(\d+\.\d+)/.exec(minecraftVersion ?? "")?.[1] ?? null;
