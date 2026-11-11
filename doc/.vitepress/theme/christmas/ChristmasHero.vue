<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Voxel from './Voxel.vue';
import { jingle } from './sound';
import './christmas.css';

// On the landing terminal: a snowy pine sits on its corner, and a snowman hides behind it,
// rising when the pointer comes near. Click it and it shakes off the cold.
const snowman = ref(null);
const cheer = ref(false);
let frame = 0;

const onMove = (e) => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const el = snowman.value;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height * 0.3);
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, len / 260);
    el.style.setProperty('--lx', `${(dx / len) * reach * 0.9}px`);
    el.style.setProperty('--ly', `${(dy / len) * reach * 0.6}px`);
  });
};

const shake = () => {
  if (cheer.value) return;
  cheer.value = true;
  jingle();
  setTimeout(() => (cheer.value = false), 1400);
};

onMounted(() => window.addEventListener('pointermove', onMove));
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove);
  cancelAnimationFrame(frame);
});
</script>

<template>
  <button ref="snowman" type="button" class="xm-hero-snowman" :class="{ 'is-cheer': cheer }" aria-label="Snowman" @click="shake">
    <span v-if="cheer" class="xm-brrr">BRRR!</span>
    <Voxel name="snowman" class="xm-snowman-eyes" />
  </button>
  <div class="xm-hero-patch" aria-hidden="true">
    <span class="xm-glow" />
    <Voxel name="patch" class="xm-lit" />
  </div>
</template>
