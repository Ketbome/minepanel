"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Github } from "lucide-react";
import { LINK_GITHUB } from "@/lib/providers/constants";

interface GitHubStarsResponse {
  stars: number | null;
}

interface GitHubStarButtonProps {
  readonly label: string;
}

export function GitHubStarButton({ label }: GitHubStarButtonProps) {
  const [stars, setStars] = useState<number | null>(null);
  const formattedStars = stars?.toLocaleString(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/github-stars`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load GitHub stars");
        }

        return response.json() as Promise<GitHubStarsResponse>;
      })
      .then(({ stars: count }) => setStars(count))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <a
      href={LINK_GITHUB}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={formattedStars ? `${label}: ${formattedStars}` : label}
      title={label}
      className="mc-slot group relative flex h-11 w-18 shrink-0 items-center justify-center gap-2 px-2 transition-[outline,box-shadow,filter] hover:outline-3 hover:outline-offset-[-1px] hover:outline-[var(--mc-emerald)] hover:brightness-110 hover:shadow-[inset_3px_3px_0_rgba(0,0,0,0.55),inset_-3px_-3px_0_rgba(255,255,255,0.06),0_0_16px_rgba(157,255,63,0.55)] focus-visible:outline-3 focus-visible:outline-[var(--mc-emerald)] sm:w-22"
    >
      <Github
        className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-emerald-300"
        aria-hidden="true"
      />
      <Image
        src="/images/star.png"
        alt=""
        width={26}
        height={26}
        className="pixelated drop-shadow-[2px_2px_0_rgba(0,0,0,0.65)] transition-transform group-hover:-translate-y-0.5 group-hover:scale-110"
      />
      {formattedStars ? (
        <span className="mc-count absolute bottom-0.5 right-1 text-xs tabular-nums">
          {formattedStars}
        </span>
      ) : null}
    </a>
  );
}
