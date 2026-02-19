<template>
  <button
    @click="count++"
    style="
      padding: 0.5em 1em;
      background: #1e40af;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    "
  >
    Clicks: {{ count }}
  </button>
</template>

<script setup>
import { ref } from 'vue';
const count = ref(0);
</script>
