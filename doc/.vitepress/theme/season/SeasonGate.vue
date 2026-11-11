<script setup>
import { defineAsyncComponent, onMounted } from 'vue';
import { enabled, initSeason, season } from './season';

// The seasons cost nothing the rest of the year: art, styles and sounds sit in async chunks.
const props = defineProps({ part: { type: String, required: true } });

const parts = {
  halloween: {
    layer: defineAsyncComponent(() => import('../halloween/HalloweenLayer.vue')),
    toggle: defineAsyncComponent(() => import('../halloween/HalloweenToggle.vue')),
    hero: defineAsyncComponent(() => import('../halloween/HalloweenHero.vue')),
  },
  christmas: {
    layer: defineAsyncComponent(() => import('../christmas/ChristmasLayer.vue')),
    toggle: defineAsyncComponent(() => import('../christmas/ChristmasToggle.vue')),
    hero: defineAsyncComponent(() => import('../christmas/ChristmasHero.vue')),
  },
};

onMounted(() => {
  if (props.part === 'layer') initSeason();
});
</script>

<template>
  <component :is="parts[season][part]" v-if="season && (part === 'toggle' || enabled)" />
</template>
