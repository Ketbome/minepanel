<template>
  <a
    class="github-stars"
    href="https://github.com/Ketbome/minepanel"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="ariaLabel"
    title="Minepanel on GitHub"
  >
    <svg class="github-stars__github" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2A11 11 0 0 1 12 6.6c1 0 2 .1 2.9.4 2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.4 5.7.4.4.8 1.1.8 2.2v2.6c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .7Z"
      />
    </svg>
    <svg class="github-stars__star" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="m12 2.4 3 6.1 6.7 1-4.9 4.7 1.2 6.7-6-3.2-6 3.2 1.2-6.7-4.9-4.7 6.7-1 3-6.1Z"
      />
    </svg>
    <span v-if="formattedStars" class="github-stars__count">{{ formattedStars }}</span>
  </a>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const CACHE_KEY = 'minepanel-github-stars';
const CACHE_TTL = 60 * 60 * 1000;
const stars = ref(null);

const formattedStars = computed(() =>
  stars.value?.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 }),
);
const ariaLabel = computed(() =>
  formattedStars.value
    ? `Minepanel on GitHub: ${formattedStars.value} stars, opens in a new tab`
    : 'Minepanel on GitHub, opens in a new tab',
);

onMounted(async () => {
  let cached = null;

  try {
    cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  } catch {
    cached = null;
  }

  if (cached && Number.isInteger(cached.stars)) {
    stars.value = cached.stars;

    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return;
    }
  }

  try {
    const response = await fetch('https://api.github.com/repos/Ketbome/minepanel', {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) return;

    const repository = await response.json();
    if (!Number.isInteger(repository.stargazers_count)) return;

    stars.value = repository.stargazers_count;

    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ stars: repository.stargazers_count, timestamp: Date.now() }),
      );
    } catch {}
  } catch {
    return;
  }
});
</script>

<style scoped>
.github-stars {
  display: inline-flex;
  min-width: 96px;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-left: 12px;
  padding: 0 10px;
  border: 2px solid var(--mp-border-strong);
  color: var(--mp-text);
  background: var(--mp-bg-panel);
  box-shadow: 3px 3px 0 var(--mp-border-strong);
  font-family: var(--mp-font-mono);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  transition: color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
}

.github-stars:hover {
  color: var(--mp-acid);
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--mp-acid);
}

.github-stars:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--mp-border-strong);
}

.github-stars__github,
.github-stars__star {
  width: 16px;
  height: 16px;
  flex: none;
}

.github-stars__star {
  color: var(--mp-acid);
}

.github-stars__count {
  min-width: 3ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 767px) {
  .github-stars {
    min-width: 68px;
    margin-left: 8px;
    padding: 0 8px;
  }

  .github-stars__github {
    display: none;
  }
}

@media (max-width: 359px) {
  .github-stars {
    min-width: 38px;
  }

  .github-stars__count {
    display: none;
  }
}
</style>
