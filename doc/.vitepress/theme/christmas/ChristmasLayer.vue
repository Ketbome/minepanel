<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { jingle } from './sound';
import './christmas.css';

// Recolors the site, lets the snow fall, and listens for "snow" typed anywhere outside a text
// field: the northern lights come out over a short flurry.
const FLURRY_MS = 7000;
const flurry = ref(false);
let typed = '';
let timer = 0;

const onKey = (e) => {
  if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  typed = (typed + e.key.toLowerCase()).slice(-4);
  if (typed !== 'snow' || flurry.value) return;
  typed = '';
  jingle();
  flurry.value = true;
  timer = setTimeout(() => (flurry.value = false), FLURRY_MS);
};

onMounted(() => {
  document.documentElement.dataset.season = 'christmas';
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  delete document.documentElement.dataset.season;
  window.removeEventListener('keydown', onKey);
  clearTimeout(timer);
});
</script>

<template>
  <div class="xm-snow" aria-hidden="true"><i /><i /><i /></div>
  <div v-if="flurry" class="xm-flurry" aria-hidden="true">
    <div class="xm-aurora"><i /><i /><i /></div>
    <div class="xm-snow xm-snow--storm"><i /><i /><i /></div>
  </div>
</template>
