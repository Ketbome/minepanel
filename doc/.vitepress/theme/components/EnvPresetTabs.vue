<script setup>
import { computed, ref } from 'vue';

const active = ref('local');

const presets = [
  {
    key: 'local',
    label: 'Local',
    desc: 'Development on the same machine.',
    value: `JWT_SECRET=your_secret\nJWT_EXPIRES_IN=2d`,
  },
  {
    key: 'remote',
    label: 'LAN / Remote',
    desc: 'Access from other devices in your network.',
    value: `JWT_SECRET=your_secret\nJWT_EXPIRES_IN=2d\nFRONTEND_URL=http://your-ip:3000\nNEXT_PUBLIC_BACKEND_URL=http://your-ip:8091`,
  },
  {
    key: 'ssl',
    label: 'Domain + SSL',
    desc: 'Production access with HTTPS.',
    value: `JWT_SECRET=your_secret\nJWT_EXPIRES_IN=2d\nFRONTEND_URL=https://minepanel.yourdomain.com\nNEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com`,
  },
];

const current = computed(() => presets.find((preset) => preset.key === active.value) || presets[0]);
</script>

<template>
  <section class="env-tabs" aria-label="Environment presets">
    <div class="tab-list" role="tablist" aria-label="Environment preset tabs">
      <button
        v-for="preset in presets"
        :key="preset.key"
        class="tab-btn"
        :class="{ active: active === preset.key }"
        role="tab"
        :aria-selected="active === preset.key"
        :aria-controls="`env-panel-${preset.key}`"
        @click="active = preset.key"
      >
        {{ preset.label }}
      </button>
    </div>

    <p class="tab-desc">{{ current.desc }}</p>

    <Transition name="panel-fade" mode="out-in">
      <div :id="`env-panel-${current.key}`" :key="current.key" class="env-panel" role="tabpanel">
        <pre><code>{{ current.value }}</code></pre>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.env-tabs {
  margin: 20px 0 10px;
  border: 2px solid var(--mp-border-strong);
  border-radius: 0;
  background: var(--mp-bg-elev);
  box-shadow: var(--mp-shadow-acid);
  overflow: hidden;
}

.tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border-bottom: 2px solid var(--mp-border);
  background: var(--mp-bg-panel);
}

.tab-btn {
  border: 2px solid var(--mp-border-strong);
  border-radius: 0;
  padding: 8px 12px;
  font: 700 11px var(--mp-font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mp-muted);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.tab-btn:hover {
  border-color: var(--mp-acid);
  color: var(--mp-text);
}

.tab-btn.active {
  color: var(--mp-bg);
  background: var(--mp-acid);
  border-color: var(--mp-acid);
}

.tab-desc {
  margin: 0;
  padding: 12px 14px 2px;
  font-size: 14px;
  color: var(--mp-muted);
}

.env-panel {
  padding: 10px 14px 14px;
}

.env-panel pre {
  margin: 0;
  border: 2px solid var(--mp-border);
  border-radius: 0;
  background: var(--mp-bg);
  color: var(--mp-text);
  padding: 12px;
  overflow-x: auto;
}

.env-panel code {
  font: 400 13px/1.6 var(--mp-font-mono);
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

@media (max-width: 768px) {
  .tab-btn {
    font-size: 10px;
    padding: 7px 9px;
  }
}
</style>
