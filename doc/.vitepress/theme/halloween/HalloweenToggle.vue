<script setup>
import Voxel from './Voxel.vue';
import { enabled, toggleSeason } from './season';
import './halloween.css';
</script>

<template>
  <button type="button" class="hw-toggle" :aria-pressed="enabled" aria-label="Halloween theme" title="Halloween theme" @click="toggleSeason">
    <Voxel name="pumpkin" />
  </button>
</template>
