<script setup>
import { defineAsyncComponent, onMounted } from 'vue';
import { enabled, initSeason, inSeason } from './season';

// The season costs nothing the rest of the year: art, styles and sounds sit in async chunks.
const props = defineProps({ part: { type: String, required: true } });

const parts = {
  layer: defineAsyncComponent(() => import('./HalloweenLayer.vue')),
  toggle: defineAsyncComponent(() => import('./HalloweenToggle.vue')),
  hero: defineAsyncComponent(() => import('./HalloweenHero.vue')),
};

onMounted(() => {
  if (props.part === 'layer') initSeason();
});
</script>

<template>
  <component :is="parts[part]" v-if="part === 'toggle' ? inSeason : enabled" />
</template>
