<script setup>
import { ref } from 'vue';

const lines = [
  'git clone https://github.com/Ketbome/minepanel.git',
  'cd minepanel',
  'docker compose up -d',
];

const copied = ref(false);

const copyAll = async () => {
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};
</script>

<template>
  <section class="mp-band" aria-label="Quick start">
    <div class="mp-quick" data-gsap="reveal">
      <div class="mp-quick-copy">
        <span class="mp-tag">[ 01 / QUICK START ]</span>
        <h2 class="mp-h2">Three commands. Done.</h2>
        <p class="mp-quick-note">
          Open <code class="is-acid">localhost:3000</code> and log in with <code>admin / admin</code>.
        </p>
      </div>
      <div class="mp-quick-code">
        <button class="mp-quick-copy-btn" :class="{ copied }" @click="copyAll">
          {{ copied ? 'COPIED ✔' : 'COPY' }}
        </button>
        <div v-for="(line, i) in lines" :key="line">
          <span class="mp-quick-num">{{ i + 1 }}</span>{{ line }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mp-band {
  border-top: 2px solid var(--mp-border);
  border-bottom: 2px solid var(--mp-border);
  background: var(--mp-bg-panel);
}

.mp-quick {
  max-width: 1200px;
  margin: 0 auto;
  padding: 72px 40px;
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 56px;
  align-items: center;
}

.mp-quick-copy {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mp-quick-note {
  color: var(--mp-muted);
  line-height: 1.6;
  margin: 0;
  font-size: 16px;
}

.mp-quick-note code {
  font-family: var(--mp-font-mono);
  background: none;
  padding: 0;
  color: var(--mp-text);
}

.mp-quick-note code.is-acid {
  color: var(--mp-acid);
}

.mp-quick-code {
  position: relative;
  background: var(--mp-bg);
  border: 2px solid var(--mp-border-strong);
  padding: 26px 30px;
  font-family: var(--mp-font-mono);
  font-size: 15px;
  line-height: 2.2;
  color: var(--mp-text);
  box-shadow: 8px 8px 0 rgba(157, 255, 63, 0.12);
  overflow-x: auto;
}

.mp-quick-num {
  color: var(--mp-dim);
  user-select: none;
  display: inline-block;
  min-width: 2ch;
  margin-right: 8px;
}

.mp-quick-copy-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  border: 2px solid var(--mp-border-strong);
  background: var(--mp-bg-panel);
  color: var(--mp-dim);
  font-family: var(--mp-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 5px 10px;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.mp-quick-copy-btn:hover {
  color: var(--mp-acid);
  border-color: var(--mp-acid);
}

.mp-quick-copy-btn.copied {
  color: var(--mp-bg);
  background: var(--mp-acid);
  border-color: var(--mp-acid);
}

@media (max-width: 900px) {
  .mp-quick {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 56px 24px;
  }

  .mp-quick-code {
    font-size: 13px;
    padding: 20px 18px;
  }
}
</style>
