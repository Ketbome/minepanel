<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { loadGsap } from '../../lib/gsap';
import HomeHero from './HomeHero.vue';
import HomeQuickStart from './HomeQuickStart.vue';
import HomeFeatures from './HomeFeatures.vue';
import HomePoweredBy from './HomePoweredBy.vue';
import HomeDocsMap from './HomeDocsMap.vue';
import HomeCta from './HomeCta.vue';

const tickerItems = ['100% FREE', 'SELF-HOSTED', 'JAVA + BEDROCK', 'DOCKER-BASED', 'MIT LICENSE'];

const root = ref(null);
let mm;
let alive = true;

// Animations are decorative: load GSAP on idle and only on desktop so it
// never competes with the SSR-painted hero on slow mobile devices.
onMounted(() => {
  if (!window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches) return;

  const start = async () => {
    const mods = await loadGsap();
    if (!mods || !alive) return;
    const { gsap } = mods;

    mm = gsap.matchMedia(root.value);
    mm.add(
      {
        desktop: '(min-width: 768px)',
        motionOk: '(prefers-reduced-motion: no-preference)',
      },
      (ctx) => {
        const { desktop, motionOk } = ctx.conditions;
        if (!motionOk) return;

        gsap.to('[data-gsap="ticker"]', { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });

        if (!desktop) return;

        const tl = gsap.timeline({ defaults: { duration: 0.7, ease: 'power2.out' } });
        tl.from('[data-gsap="hero-copy"] > *', { y: 34, autoAlpha: 0, stagger: 0.1 }).from(
          '[data-gsap="hero-terminal"]',
          { y: 50, autoAlpha: 0, rotate: 4, duration: 0.8 },
          '-=0.45',
        );

        gsap.utils.toArray('[data-gsap="reveal"]').forEach((el) => {
          gsap.from(el, {
            y: 52,
            autoAlpha: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 82%' },
          });
        });

        gsap.utils.toArray('.mp-features-grid, .mp-docsmap-grid').forEach((grid) => {
          const cards = grid.querySelectorAll('[data-gsap="card"]');
          if (!cards.length) return;
          gsap.from(cards, {
            y: 30,
            autoAlpha: 0,
            duration: 0.55,
            ease: 'power2.out',
            stagger: 0.07,
            scrollTrigger: { trigger: grid, start: 'top 80%' },
          });
        });
      },
    );
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => start(), { timeout: 1500 });
  } else {
    setTimeout(start, 200);
  }
});

onBeforeUnmount(() => {
  alive = false;
  if (mm) mm.revert();
});
</script>

<template>
  <main ref="root" class="mp-landing">
    <div class="mp-ticker" aria-hidden="true">
      <div class="mp-ticker-track" data-gsap="ticker">
        <template v-for="n in 2">
          <template v-for="item in tickerItems" :key="`${n}-${item}`">
            <span>{{ item }}</span>
            <span>◆</span>
          </template>
        </template>
      </div>
    </div>

    <HomeHero />
    <HomeQuickStart />
    <HomeFeatures />
    <HomePoweredBy />
    <HomeDocsMap />
    <HomeCta />
  </main>
</template>

<style scoped>
.mp-landing {
  min-height: 100dvh;
  background-color: var(--mp-bg);
  background-image: linear-gradient(rgba(157, 255, 63, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(157, 255, 63, 0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  color: var(--mp-text);
  overflow-x: clip;
}

.mp-ticker {
  background: var(--mp-acid);
  color: var(--mp-bg);
  font-family: var(--mp-font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 8px 0;
  white-space: nowrap;
  overflow: hidden;
}

.mp-ticker-track {
  display: inline-flex;
  gap: 48px;
  padding-left: 24px;
}
</style>

<style>
/* Shared landing primitives (unscoped so child components can use them) */
.mp-landing .mp-tag {
  font-family: var(--mp-font-mono);
  font-size: 13px;
  color: var(--mp-acid);
  font-weight: 700;
}

.mp-landing .mp-h2 {
  font-family: var(--mp-font-display);
  font-size: 42px;
  margin: 0;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: var(--mp-text);
  border: none;
  padding: 0;
}

.mp-landing .mp-btn-acid {
  display: inline-block;
  background: var(--mp-acid);
  color: var(--mp-bg);
  padding: 16px 32px;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 6px 6px 0 var(--mp-border-strong);
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.mp-landing .mp-btn-acid:hover {
  background: var(--mp-acid-soft);
  color: var(--mp-bg);
  box-shadow: 3px 3px 0 var(--mp-border-strong);
  transform: translate(3px, 3px);
}

.mp-landing .mp-btn-acid.is-big {
  padding: 18px 44px;
  font-size: 18px;
}

.mp-landing .mp-btn-ghost {
  display: inline-block;
  border: 2px solid var(--mp-border-strong);
  color: var(--mp-text);
  padding: 14px 32px;
  font-weight: 700;
  font-size: 16px;
  transition: border-color 0.15s ease;
}

.mp-landing .mp-btn-ghost:hover {
  border-color: var(--mp-acid);
  color: var(--mp-text);
}
</style>
