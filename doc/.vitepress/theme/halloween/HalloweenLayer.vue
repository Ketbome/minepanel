<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Voxel from './Voxel.vue';
import { flutter } from './sound';
import './halloween.css';

// Recolors the site, lays the fog, and listens for "boo" typed anywhere outside a text field:
// bats burst out from wherever the pointer is.
const bats = ref([]);
let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let typed = '';
let id = 0;

const onMove = (e) => {
  pointer = { x: e.clientX, y: e.clientY };
};

const onKey = (e) => {
  if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  typed = (typed + e.key.toLowerCase()).slice(-3);
  if (typed !== 'boo') return;
  typed = '';
  flutter();
  const burst = Array.from({ length: 7 }, (_, i) => {
    const angle = -Math.PI / 2 + (i - 3) * 0.42 + (Math.random() - 0.5) * 0.3;
    const reach = 220 + Math.random() * 180;
    return {
      id: id++,
      x: pointer.x,
      y: pointer.y,
      dx: `${Math.cos(angle) * reach}px`,
      dy: `${Math.sin(angle) * reach}px`,
      size: 72 + Math.random() * 40,
      delay: `${i * 40}ms`,
    };
  });
  bats.value = [...bats.value, ...burst];
  setTimeout(() => {
    const gone = new Set(burst.map((b) => b.id));
    bats.value = bats.value.filter((b) => !gone.has(b.id));
  }, 1900);
};

onMounted(() => {
  document.documentElement.dataset.season = 'halloween';
  window.addEventListener('pointermove', onMove);
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  delete document.documentElement.dataset.season;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="hw-fog" aria-hidden="true"><i /><i /></div>
  <div
    v-for="bat in bats"
    :key="bat.id"
    class="hw-burst"
    aria-hidden="true"
    :style="{ left: `${bat.x}px`, top: `${bat.y}px`, width: `${bat.size}px`, '--dx': bat.dx, '--dy': bat.dy, animationDelay: bat.delay }"
  >
    <div class="hw-frames is-moving">
      <Voxel name="bat" />
      <Voxel name="batFlap" />
    </div>
  </div>
</template>
