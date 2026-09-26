import { FC } from "react";

// Hand-drawn pixel maps (not Mojang assets). Each character is one pixel; "." is transparent.
export const SPRITES = {
  heart: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  food: ["...MMM.", "..MMMMM", "..MMMMM", "..MMMM.", ".B.MM..", "B.B....", ".B....."],
  head: [".XXXXXX.", "XXXXXXXX", "XX....XX", "XX....XX"],
  chest: ["XX....XX", "XXX..XXX", "XXXXXXXX", ".XXXXXX.", ".XXXXXX.", ".XXXXXX.", ".XXXXXX."],
  legs: ["XXXXXXXX", "XXXXXXXX", "XXX..XXX", "XX....XX", "XX....XX", "XX....XX", "XX....XX"],
  feet: [".XX..XX.", ".XX..XX.", "XXX..XXX", "XXX..XXX"],
  offhand: ["XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX.."],
} as const;

interface PixelSpriteProps {
  map: readonly string[];
  colors: Record<string, string>;
  /** Pixels in columns at or past this index use `emptyColor` (half hearts). */
  fillColumns?: number;
  emptyColor?: string;
  size?: number;
  className?: string;
}

export const PixelSprite: FC<PixelSpriteProps> = ({ map, colors, fillColumns = Infinity, emptyColor, size = 14, className }) => {
  const width = Math.max(...map.map((row) => row.length));
  return (
    <svg viewBox={`0 0 ${width} ${map.length}`} width={size} height={(size * map.length) / width} shapeRendering="crispEdges" aria-hidden className={className}>
      {map.flatMap((row, y) =>
        [...row].map((pixel, x) => (pixel === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={x >= fillColumns && emptyColor ? emptyColor : colors[pixel]} />)),
      )}
    </svg>
  );
};
