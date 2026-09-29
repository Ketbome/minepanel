import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

export type VanillaTweaksType = 'datapacks' | 'craftingtweaks' | 'resourcepacks';

export interface VanillaTweaksShare {
  code: string;
  type: VanillaTweaksType;
  version: string;
  packs: Record<string, string[]>;
}

// The part after "#" in https://vanillatweaks.net/share#MGr52E
export const VANILLA_TWEAKS_CODE = /^[A-Za-z0-9]{3,16}$/;
const SHARE_CODE_URL = 'https://vanillatweaks.net/assets/server/sharecode.php';
const TYPES: VanillaTweaksType[] = ['datapacks', 'craftingtweaks', 'resourcepacks'];
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
// A share code answer is well under 1 KB; this only keeps a misbehaving upstream from costing memory.
const MAX_BODY_BYTES = 1_000_000;

/** Looks up what a Vanilla Tweaks share code installs, the same way itzg's mc-image-helper does. */
@Injectable()
export class VanillaTweaksService {
  private readonly logger = new Logger(VanillaTweaksService.name);
  private readonly cache = new Map<string, { value: VanillaTweaksShare | null; expires: number }>();

  /** null when Vanilla Tweaks does not know the code; throws when it cannot be asked. */
  async lookup(code: string): Promise<VanillaTweaksShare | null> {
    if (!VANILLA_TWEAKS_CODE.test(code)) return null;
    const cached = this.cache.get(code);
    if (cached && cached.expires > Date.now()) return cached.value;

    let value: VanillaTweaksShare | null;
    try {
      // Only a 200 or a 404 is an answer about the code. A 403 or 429 (Cloudflare) says nothing about
      // it, and a challenge page is not JSON either: those must not be remembered as "not found".
      const response = await axios.get(SHARE_CODE_URL, {
        params: { code },
        timeout: 8000,
        maxRedirects: 0,
        maxContentLength: MAX_BODY_BYTES,
        validateStatus: (status) => status === 200 || status === 404,
      });
      const body = toObject(response.data);
      if (response.status === 200 && !body) throw new Error('the answer is not JSON');
      value = response.status === 404 ? null : parseShare(code, body);
    } catch (error) {
      this.logger.warn(`Vanilla Tweaks lookup failed for ${code}: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Vanilla Tweaks could not be reached');
    }

    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(code, { value, expires: Date.now() + CACHE_TTL_MS });
    return value;
  }
}

function toObject(data: unknown): Record<string, unknown> | null {
  const body = typeof data === 'string' ? safeJson(data) : data;
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
}

function parseShare(code: string, body: Record<string, unknown> | null): VanillaTweaksShare | null {
  if (!body) return null;
  const { result, type, version, packs } = body;
  if (result !== 'ok' || !TYPES.includes(type as VanillaTweaksType) || typeof version !== 'string' || !packs || typeof packs !== 'object') return null;
  const categories = Object.fromEntries(
    Object.entries(packs as Record<string, unknown>).map(([category, names]) => [category, Array.isArray(names) ? names.filter((name): name is string => typeof name === 'string') : []]),
  );
  return { code, type: type as VanillaTweaksType, version, packs: categories };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
