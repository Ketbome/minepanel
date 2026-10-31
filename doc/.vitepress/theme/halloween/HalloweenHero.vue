<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Voxel from './Voxel.vue';
import { boo } from './sound';
import './halloween.css';

// On the landing terminal: a pumpkin patch sits on its corner and lights it, and a ghost hides
// behind it, rising when the pointer comes near. Click it and it says boo.
const ghost = ref(null);
const spooked = ref(false);
let frame = 0;

const onMove = (e) => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const el = ghost.value;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height * 0.4);
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, len / 260);
    el.style.setProperty('--lx', `${(dx / len) * reach * 0.9}px`);
    el.style.setProperty('--ly', `${(dy / len) * reach * 0.6}px`);
  });
};

const spook = () => {
  if (spooked.value) return;
  spooked.value = true;
  boo();
  setTimeout(() => (spooked.value = false), 1400);
};

onMounted(() => window.addEventListener('pointermove', onMove));
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove);
  cancelAnimationFrame(frame);
});
</script>

<template>
  <button ref="ghost" type="button" class="hw-hero-ghost" :class="{ 'is-spooked': spooked }" aria-label="Boo" @click="spook">
    <span v-if="spooked" class="hw-boo">BOO!</span>
    <Voxel :name="spooked ? 'ghostCover' : 'ghost'" class="hw-ghost-eyes" />
  </button>
  <div class="hw-hero-patch" aria-hidden="true">
    <span class="hw-glow" />
    <Voxel name="patch" class="hw-lit" />
  </div>
</template>
