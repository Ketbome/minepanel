import Image from 'next/image';
import { ItemIcon } from '../items';
import { DragonHeadIcon, DragonEggIcon, EyeOfEnderIcon } from '../PixelIcons';
import type { AdvancementIcon } from '../store/types';

export function AdvancementBadge({ icon }: { readonly icon: AdvancementIcon }) {
  if (icon === 'eye') return <EyeOfEnderIcon className="h-7 w-7" />;
  if (icon === 'egg') return <DragonEggIcon className="h-7 w-7" />;
  if (icon === 'dragon') return <DragonHeadIcon className="h-7 w-7" />;
  if (icon === 'sword') return <ItemIcon item="sword" className="h-7 w-7" />;
  if (icon === 'rod') return <ItemIcon item="rod" className="h-7 w-7" />;
  if (icon === 'elytra') return <ItemIcon item="elytra" className="h-7 w-7" />;
  if (icon === 'button') return <ItemIcon item="obsidian" className="h-7 w-7" />;
  if (icon === 'fireball') return <ItemIcon item="blaze" className="h-7 w-7" />;
  return <Image src="/images/ender-pearl.webp" alt="" width={28} height={28} className="pixelated h-7 w-7 object-contain" />;
}
