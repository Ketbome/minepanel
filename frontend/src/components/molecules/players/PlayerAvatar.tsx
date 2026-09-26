import { FC } from "react";
import Image from "next/image";

interface PlayerAvatarProps {
  // Name when known: mc-heads resolves it to the skin, which also works for offline-mode UUIDs
  player: string;
  size?: number;
}

export const PlayerAvatar: FC<PlayerAvatarProps> = ({ player, size = 32 }) => (
  <Image src={`https://mc-heads.net/avatar/${encodeURIComponent(player)}/${size}`} alt={player} width={size} height={size} unoptimized className="pixelated shrink-0" />
);
