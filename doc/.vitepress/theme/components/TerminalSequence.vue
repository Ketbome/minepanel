<script setup>
import { computed, onMounted, ref } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'command-sequence',
  },
  steps: {
    type: Array,
    required: true,
  },
  prompt: {
    type: String,
    default: '$',
  },
  startDelayMs: {
    type: Number,
    default: 220,
  },
  lineGapMs: {
    type: Number,
    default: 260,
  },
  charMs: {
    type: Number,
    default: 55,
  },
});

const rootEl = ref(null);
const isVisible = ref(false);
const reduceMotion = ref(false);
const copiedIdx = ref(null);

const rows = computed(() => {
  const normalized = Array.isArray(props.steps) ? props.steps : [];
  let delay = props.startDelayMs;
  const list = [];

  normalized.forEach((step, idx) => {
    const command = String(step.command || '');
    const outputs = Array.isArray(step.outputs) ? step.outputs : [];
    const duration = Math.max(850, command.length * props.charMs);

    list.push({
      key: `cmd-${idx}`,
      type: 'command',
      text: command,
      canCopy: true,
      idx: idx,
      style: {
        '--typing-width': `${command.length}ch`,
        '--typing-duration': `${duration}ms`,
        '--typing-delay': `${delay}ms`,
      },
    });

    delay += duration + 180;

    outputs.forEach((line, lineIdx) => {
      list.push({
        key: `out-${idx}-${lineIdx}`,
        type: 'output',
        text: String(line),
        canCopy: false,
        style: {
          animationDelay: `${delay + lineIdx * props.lineGapMs}ms`,
        },
      });
    });

    delay += outputs.length * props.lineGapMs + 170;
  });

  return list;
});

const copyCommand = async (text, idx) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedIdx.value = idx;
    setTimeout(() => {
      copiedIdx.value = null;
    }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

onMounted(() => {
  if (typeof window === 'undefined') {
    isVisible.value = true;
    return;
  }

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduceMotion.value = media.matches;

  if (media.matches) {
    isVisible.value = true;
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        isVisible.value = true;
        observer.disconnect();
      }
    },
    { threshold: 0.3 },
  );

  if (rootEl.value) {
    observer.observe(rootEl.value);
  }
});
</script>

<template>
  <section ref="rootEl" class="terminal-wrap" aria-label="Terminal sequence demo">
    <div class="terminal" role="img" :aria-label="`Terminal sequence for ${title}`">
      <div class="terminal-bar">
        <span class="label">~/{{ title }}</span>
        <span class="status">● LIVE</span>
      </div>

      <div class="terminal-body">
        <template v-for="row in rows" :key="row.key">
          <div v-if="row.type === 'command'" class="line-row">
            <p class="line command">
              <span class="prompt">{{ prompt }}</span>
              <span class="typed" :class="{ run: isVisible && !reduceMotion }" :style="row.style">
                {{ row.text }}
              </span>
              <span v-if="reduceMotion" class="typed-static">{{ row.text }}</span>
            </p>
            <button
              v-if="row.canCopy"
              class="copy-btn"
              :class="{ copied: copiedIdx === row.idx }"
              @click="copyCommand(row.text, row.idx)"
              :title="copiedIdx === row.idx ? 'Copied!' : 'Copy'"
            >
              <svg v-if="copiedIdx !== row.idx" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
          <p
            v-else
            class="line output"
            :class="{ run: isVisible && !reduceMotion, static: reduceMotion }"
            :style="row.style"
          >
            {{ row.text }}
          </p>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.terminal-wrap {
  margin: 22px 0 12px;
}

.terminal {
  border: 2px solid var(--mp-border-strong);
  border-radius: 0;
  overflow: hidden;
  box-shadow: var(--mp-shadow-acid);
  background: var(--mp-bg-elev);
}

.terminal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--mp-bg-panel);
  border-bottom: 2px solid var(--mp-border);
}

.label {
  color: var(--mp-dim);
  font: 400 12px var(--mp-font-mono);
  letter-spacing: 0.01em;
}

.status {
  color: var(--mp-acid);
  font: 700 12px var(--mp-font-mono);
}

.terminal-body {
  padding: 14px 16px 16px;
  color: var(--mp-muted);
  font: 400 14px/1.6 var(--mp-font-mono);
  background-image: repeating-linear-gradient(
    0deg,
    rgba(157, 255, 63, 0.02) 0px,
    rgba(157, 255, 63, 0.02) 1px,
    transparent 1px,
    transparent 4px
  );
}

.line-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
}

.line-row + .line-row {
  margin-top: 8px;
}

.line {
  margin: 0;
  flex: 1;
  min-width: 0;
}

.command {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.command + .output {
  margin-top: 8px;
}

.prompt {
  color: var(--mp-acid);
  font-weight: 700;
}

.typed {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  border-right: 2px solid var(--mp-acid);
  color: var(--mp-text);
}

.typed.run {
  animation: typing var(--typing-duration) steps(24, end) var(--typing-delay) forwards;
}

.typed-static {
  display: inline-block;
}

.output {
  opacity: 0;
  transform: translateY(4px);
}

.output.run {
  animation: reveal 0.35s ease forwards;
}

.output.static {
  opacity: 1;
  transform: none;
}

@keyframes typing {
  to {
    width: var(--typing-width);
  }
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.copy-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  color: var(--mp-dim);
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  opacity: 1;
  background: rgba(157, 255, 63, 0.15);
  color: var(--mp-acid);
}

.copy-btn.copied {
  opacity: 1;
  color: var(--mp-acid);
}

@media (max-width: 768px) {
  .terminal-body {
    font-size: 13px;
  }
}
</style>
