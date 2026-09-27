'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { LINK_GITHUB } from '@/lib/providers/constants';

interface Contributor {
  readonly login: string;
  readonly avatar: string;
  readonly url: string;
  readonly contributions: number;
}

export function ContributorsThanks() {
  const { t } = useLanguage();
  const [contributors, setContributors] = useState<Contributor[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/github-contributors`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load GitHub contributors');
        }

        return response.json() as Promise<{ contributors: Contributor[] | null }>;
      })
      .then(({ contributors: list }) => setContributors(list ?? []))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <section className="mb-8 border-2 border-emerald-400/40 bg-emerald-400/5 px-4 py-6 text-center sm:px-8">
      <Heart className="mx-auto mb-3 h-8 w-8 fill-emerald-400/30 text-emerald-400" aria-hidden="true" />
      <h2 className="font-minecraft text-xl text-emerald-300 sm:text-2xl">{t('contributorsTitle')}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-300">{t('contributorsBody')}</p>
      {contributors.length > 0 && (
        <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
          {contributors.map((contributor) => {
            const label = `@${contributor.login} · ${t('contributorsCount').replace('{count}', String(contributor.contributions))}`;
            return (
              <li key={contributor.login}>
                <a
                  href={contributor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  aria-label={label}
                  className="mc-slot block h-14 w-14 p-1 transition-[outline,filter] hover:outline-3 hover:outline-offset-[-1px] hover:outline-[var(--mc-emerald)] hover:brightness-110 focus-visible:outline-3 focus-visible:outline-[var(--mc-emerald)]"
                >
                  <Image src={`${contributor.avatar}&s=96`} alt="" width={48} height={48} unoptimized className="h-full w-full" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <a
        href={`${LINK_GITHUB}/graphs/contributors`}
        target="_blank"
        rel="noopener noreferrer"
        className="mc-btn mt-5 inline-flex items-center px-4 py-2 text-sm"
      >
        {t('contributorsCta')}
      </a>
    </section>
  );
}
