<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Orchestrator from '../wavy-cubes-reference/Orchestrator.js';
import '../wavy-cubes-reference/wavy-cubes-reference.css';

const canvas = ref<HTMLCanvasElement | null>(null);
let orchestrator: Orchestrator | null = null;

onMounted(async () => {
  if (!canvas.value) return;
  orchestrator = new Orchestrator(canvas.value);
  await orchestrator.initialize();
});

onBeforeUnmount(() => {
  orchestrator?.destroy();
  orchestrator = null;
});
</script>

<template>
  <main class="wavy-cubes-reference-page" aria-label="Wavy Cubes reference preview">
    <canvas ref="canvas" class="webgl" aria-label="Interactive Wavy Cubes reference scene"></canvas>
  </main>
</template>
