<script setup>
import { computed, onMounted, ref } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'minepanel-terminal',
  },
  command: {
    type: String,
    required: true,
  },
  outputs: {
    type: Array,
    default: () => [],
  },
  prompt: {
    type: String,
    default: '$',
  },
  typingMs: {
    type: Number,
    default: 2000,
  },
  startDelayMs: {
    type: Number,
    default: 220,
  },
  lineGapMs: {
    type: Number,
    default: 300,
  },
});

const rootEl = ref(null);
const isVisible = ref(false);
const reduceMotion = ref(false);

const typingStyle = computed(() => ({
  '--typing-width': `${props.command.length}ch`,
  '--typing-duration': `${props.typingMs}ms`,
  '--typing-delay': `${props.startDelayMs}ms`,
}));

const getOutputStyle = (idx) => ({
  animationDelay: `${props.startDelayMs + props.typingMs + 260 + idx * props.lineGapMs}ms`,
});

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
    { threshold: 0.35 },
  );

  if (rootEl.value) {
    observer.observe(rootEl.value);
  }
});
</script>

<template>
  <section ref="rootEl" class="terminal-wrap" aria-label="Terminal command demo">
    <div class="terminal" role="img" :aria-label="`Terminal animation showing ${command}`">
      <div class="terminal-bar">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span class="label">{{ title }}</span>
      </div>

      <div class="terminal-body">
        <p class="line command-line">
          <span class="prompt">{{ prompt }}</span>
          <span class="typed" :class="{ run: isVisible && !reduceMotion }" :style="typingStyle">
            {{ command }}
          </span>
          <span v-if="reduceMotion" class="typed-static">{{ command }}</span>
        </p>

        <p
          v-for="(line, idx) in outputs"
          :key="`${idx}-${line}`"
          class="line output"
          :class="{ run: isVisible && !reduceMotion, static: reduceMotion }"
          :style="getOutputStyle(idx)"
        >
          {{ line }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.terminal-wrap {
  margin: 22px 0 12px;
}

.terminal {
  border: 3px solid rgba(53, 79, 42, 0.8);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 12px 28px rgba(20, 38, 16, 0.25);
  background: #11170f;
}

.terminal-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(180deg, #313f2d 0%, #1f291d 100%);
  border-bottom: 2px solid rgba(122, 166, 93, 0.4);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.red {
  background: #d66b6b;
}

.yellow {
  background: #dfc37f;
}

.green {
  background: #82c763;
}

.label {
  margin-left: 8px;
  color: #dbe8d4;
  font: 400 11px var(--minecraft-font-ui);
  letter-spacing: 0.01em;
}

.terminal-body {
  padding: 14px 16px 16px;
  color: #e9f2e4;
  font: 400 14px/1.55 var(--vp-font-family-mono);
}

.line {
  margin: 0;
  white-space: pre-wrap;
}

.command-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prompt {
  color: #7fbe5f;
  font-weight: 700;
}

.typed {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  border-right: 2px solid #a7e181;
}

.typed.run {
  animation:
    typing var(--typing-duration) steps(24, end) var(--typing-delay) forwards,
    blink 0.75s step-end infinite;
}

.typed-static {
  display: inline-block;
}

.output {
  opacity: 0;
  transform: translateY(4px);
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-all;
}

.output.run {
  animation: reveal 0.35s ease forwards;
}

.output.static {
  opacity: 1;
  transform: none;
}

.output:first-of-type {
  margin-top: 10px;
  color: #b9dca7;
}

@keyframes typing {
  to {
    width: var(--typing-width);
  }
}

@keyframes blink {
  50% {
    border-right-color: transparent;
  }
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .terminal-body {
    font-size: 13px;
  }

  .label {
    font-size: 10px;
  }
}
</style>
