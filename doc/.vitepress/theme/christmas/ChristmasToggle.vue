<script setup>
import Voxel from './Voxel.vue';
import { enabled, toggleSeason } from '../season/season';
import './christmas.css';
</script>

<template>
  <button type="button" class="xm-toggle" :aria-pressed="enabled" aria-label="Christmas theme" title="Christmas theme" @click="toggleSeason">
    <Voxel name="giftRed" />
  </button>
</template>
