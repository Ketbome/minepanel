import { FC } from "react";
import Image from "next/image";

interface PlayerAvatarProps {
  // UUID when known: mc-heads recommends UUID lookups for speed, and it's the only form that
  // resolves Bedrock/Floodgate players, whose usernames aren't valid Mojang profiles. Fall back
  // to name only when no UUID is known yet (a player online for the first time).
  player: string;
  size?: number;
}

export const PlayerAvatar: FC<PlayerAvatarProps> = ({ player, size = 32 }) => (
  <Image src={`https://mc-heads.net/avatar/${encodeURIComponent(player)}/${size}`} alt={player} width={size} height={size} unoptimized className="pixelated shrink-0" />
);
