import { FC } from "react";
import Image from "next/image";

interface PlayerAvatarProps {
  // UUID when known: mc-heads recommends UUID lookups for speed, and it's the only form that
  // resolves Bedrock/Floodgate players, whose usernames aren't valid Mojang profiles.
  uuid?: string;
  name: string;
  size?: number;
}

// mc-heads resolves Mojang (v4) and Floodgate UUIDs, but an offline-mode UUID (v3, derived from
// the name) has no profile behind it, so those players and ones without a known UUID go by name
const avatarId = (uuid: string | undefined, name: string) => (uuid && uuid[14] !== "3" ? uuid : name);

export const PlayerAvatar: FC<PlayerAvatarProps> = ({ uuid, name, size = 32 }) => (
  <Image src={`https://mc-heads.net/avatar/${encodeURIComponent(avatarId(uuid, name))}/${size}`} alt={name} width={size} height={size} unoptimized className="pixelated shrink-0" />
);
