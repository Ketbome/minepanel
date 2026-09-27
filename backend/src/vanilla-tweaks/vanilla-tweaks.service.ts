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

    let data: unknown;
    try {
      const response = await axios.get(SHARE_CODE_URL, { params: { code }, timeout: 8000, validateStatus: (status) => status < 500 });
      data = response.status === 404 ? null : response.data;
    } catch (error) {
      this.logger.warn(`Vanilla Tweaks lookup failed for ${code}: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Vanilla Tweaks could not be reached');
    }

    const value = parseShare(code, data);
    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(code, { value, expires: Date.now() + CACHE_TTL_MS });
    return value;
  }
}

function parseShare(code: string, data: unknown): VanillaTweaksShare | null {
  const body = typeof data === 'string' ? safeJson(data) : data;
  if (!body || typeof body !== 'object') return null;
  const { result, type, version, packs } = body as Record<string, unknown>;
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
