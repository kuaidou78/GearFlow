<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Orchestrator from '../wavy-cubes-reference/Orchestrator.js';

const rootEl = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let orchestrator: Orchestrator | null = null;
let resizeObserver: ResizeObserver | null = null;

const dashboardTheme = {
  background: '#090A08',
  base: '#2D2F2A',
  highlight: '#D8C47E',
  rgbShift: 0.003,
  vignetteStrength: 0.38
};

function getSize() {
  const rect = rootEl.value?.getBoundingClientRect();
  return { width: rect?.width || 1, height: rect?.height || 1 };
}

onMounted(async () => {
  if (!canvasEl.value || !rootEl.value || orchestrator) return;
  const pointerTarget = rootEl.value.parentElement;
  if (!pointerTarget) return;
  orchestrator = new Orchestrator(canvasEl.value, {
    theme: dashboardTheme,
    pointerTarget,
    getSize
  });
  await orchestrator.initialize();
  resizeObserver = new ResizeObserver(() => orchestrator?.resize());
  resizeObserver.observe(rootEl.value);
  orchestrator.resize();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  orchestrator?.destroy();
  orchestrator = null;
});
</script>

<template>
  <div ref="rootEl" class="dashboard-wavy-cubes" aria-hidden="true">
    <canvas ref="canvasEl" class="dashboard-wavy-cubes__canvas"></canvas>
  </div>
</template>
