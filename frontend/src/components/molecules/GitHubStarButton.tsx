"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
      {/* lucide-react 1.x dropped brand icons, so the GitHub mark lives here. */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-emerald-300"
        aria-hidden="true"
      >
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
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
