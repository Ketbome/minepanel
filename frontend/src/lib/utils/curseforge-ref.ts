// The host has to end at a boundary, or `notcurseforge.com/minecraft/modpacks/x`
// would be read as a pack reference.
const MODPACK_URL = /(?:^|\/\/)(?:[\w-]+\.)*curseforge\.com\/minecraft\/modpacks\/([^/?#]+)(?:\/(?:download|files)\/(\d+))?/i;

export const parseModpackUrl = (url: string): { slug?: string; fileId?: string } => {
  const match = MODPACK_URL.exec(url.trim());
  if (!match) return {};
  return { slug: match[1], fileId: match[2] };
};

/**
 * Turns whatever the user typed into the search box into something the exact
 * lookup can take: a pasted page URL, a slug, a numeric project id, or a plain
 * name slugified the way CurseForge does it ("All The Mods 9" -> all-the-mods-9).
 * Exact lookup is a different index than the fuzzy search, so it finds packs the
 * search never ranks.
 */
export const modpackRefFromQuery = (query: string): string | undefined => {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  const fromUrl = parseModpackUrl(trimmed).slug;
  if (fromUrl) return fromUrl;

  // A URL for something else is not a reference, and slugifying it produces noise.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return undefined;

  if (/^\d+$/.test(trimmed)) return trimmed;

  const slug = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length >= 2 ? slug : undefined;
};
