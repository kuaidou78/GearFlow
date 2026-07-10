<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';

const rootEl = ref<HTMLElement | null>(null);
const ready = ref(false);
const failed = ref(false);

const COLORS = {
  sceneBackground: '#080A08',
  cubeBase: '#292C25',
  cubeShadow: '#151713',
  waveMid: '#756F45',
  waveHighlight: '#D8C568',
  peakSpecular: '#EEE1A1',
  ambientLight: '#6C6D60',
  directionalLight: '#F1E7C5'
};

type TrailPoint = { x: number; z: number; age: number; strength: number };

let renderer: any = null;
let scene: any = null;
let camera: any = null;
let grid: any = null;
let geometry: any = null;
let material: any = null;
let rafId = 0;
let lastFrame = 0;
let dynamicEnabled = false;
let visible = true;
let trail: TrailPoint[] = [];
let heights = new Float32Array();
let offsets = new Float32Array();
let gridColumns = 0;
let gridRows = 0;
let gridWidth = 0;
let gridDepth = 0;

const dummy = new THREE.Object3D();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const pointerWorld = new THREE.Vector3();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const baseColor = new THREE.Color(COLORS.cubeBase);
const midColor = new THREE.Color(COLORS.waveMid);
const highlightColor = new THREE.Color(COLORS.waveHighlight);
const specularColor = new THREE.Color(COLORS.peakSpecular);
const mixedColor = new THREE.Color();

function viewportGrid() {
  if (window.innerWidth < 768) return { columns: 20, rows: 13, dynamic: false, maxHeight: 0.22 };
  if (window.innerWidth < 1100) return { columns: 28, rows: 18, dynamic: true, maxHeight: 0.42 };
  return { columns: 36, rows: 22, dynamic: true, maxHeight: 0.52 };
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function disposeGrid() {
  if (grid && scene) scene.remove(grid);
  geometry?.dispose();
  material?.dispose();
  grid = null;
  geometry = null;
  material = null;
}

function buildGrid() {
  if (!scene) return;
  disposeGrid();
  const settings = viewportGrid();
  gridColumns = settings.columns;
  gridRows = settings.rows;
  dynamicEnabled = settings.dynamic && !prefersReducedMotion();

  const count = gridColumns * gridRows;
  const cubeSize = 0.48;
  const spacing = 0.62;
  const baseHeight = 0.34;
  const xOffset = ((gridColumns - 1) * spacing) / 2;
  const zOffset = ((gridRows - 1) * spacing) / 2;
  gridWidth = gridColumns * spacing;
  gridDepth = gridRows * spacing;
  heights = new Float32Array(count);
  offsets = new Float32Array(count * 2);
  geometry = new THREE.BoxGeometry(cubeSize, baseHeight, cubeSize);
  material = new THREE.MeshStandardMaterial({
    color: COLORS.cubeBase,
    roughness: 0.82,
    metalness: 0.14,
    vertexColors: true
  });
  grid = new THREE.InstancedMesh(geometry, material, count);
  grid.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grid.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  grid.frustumCulled = false;

  for (let row = 0; row < gridRows; row += 1) {
    for (let column = 0; column < gridColumns; column += 1) {
      const index = row * gridColumns + column;
      const x = column * spacing - xOffset;
      const z = row * spacing - zOffset;
      offsets[index * 2] = x;
      offsets[index * 2 + 1] = z;
      dummy.position.set(x, baseHeight / 2, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      grid.setMatrixAt(index, dummy.matrix);
      grid.setColorAt(index, baseColor);
    }
  }
  grid.instanceMatrix.needsUpdate = true;
  if (grid.instanceColor) grid.instanceColor.needsUpdate = true;
  grid.userData = { baseHeight, maxHeight: settings.maxHeight };
  scene.add(grid);
}

function addTrailPoint(x: number, z: number) {
  const last = trail[trail.length - 1];
  const distance = last ? Math.hypot(last.x - x, last.z - z) : Infinity;
  if (distance < 0.16) return;
  trail.push({ x, z, age: 0, strength: Math.min(1, distance / 0.7) });
  if (trail.length > 14) trail.shift();
}

function handlePointerMove(event: PointerEvent) {
  if (!dynamicEnabled || !camera) return;
  pointerNdc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, pointerWorld)) return;
  if (Math.abs(pointerWorld.x) > gridWidth * 0.62 || Math.abs(pointerWorld.z) > gridDepth * 0.62) return;
  addTrailPoint(pointerWorld.x, pointerWorld.z);
}

function handlePointerLeave() {
  // Existing points fade naturally; no new point is added after pointer exit.
}

function updateGrid(delta: number) {
  if (!grid) return;
  const baseHeight = grid.userData.baseHeight as number;
  const maxHeight = grid.userData.maxHeight as number;
  const radius = window.innerWidth < 1100 ? 2.05 : 2.55;
  const trailLifetime = window.innerWidth < 1100 ? 0.72 : 0.92;
  const rise = 1 - Math.exp(-delta * 15);
  const settle = 1 - Math.exp(-delta * 8);

  for (let pointIndex = trail.length - 1; pointIndex >= 0; pointIndex -= 1) {
    trail[pointIndex].age += delta;
    if (trail[pointIndex].age > trailLifetime) trail.splice(pointIndex, 1);
  }

  for (let index = 0; index < heights.length; index += 1) {
    const x = offsets[index * 2];
    const z = offsets[index * 2 + 1];
    let target = 0;
    for (let pointIndex = 0; pointIndex < trail.length; pointIndex += 1) {
      const point = trail[pointIndex];
      const normalizedDistance = Math.hypot(x - point.x, z - point.z) / radius;
      if (normalizedDistance >= 1) continue;
      const falloff = 1 - normalizedDistance;
      const smoothFalloff = falloff * falloff * (3 - 2 * falloff);
      const fade = 1 - point.age / trailLifetime;
      const shortRipple = 0.88 + Math.cos(normalizedDistance * 5.8 - point.age * 7.5) * 0.12;
      target = Math.max(target, smoothFalloff * fade * shortRipple * maxHeight * point.strength);
    }

    const easing = target > heights[index] ? rise : settle;
    heights[index] += (target - heights[index]) * easing;
    if (Math.abs(heights[index]) < 0.0005) heights[index] = 0;

    const normalizedHeight = Math.min(1, heights[index] / maxHeight);
    if (normalizedHeight < 0.58) mixedColor.lerpColors(baseColor, midColor, normalizedHeight / 0.58);
    else if (normalizedHeight < 0.92) mixedColor.lerpColors(midColor, highlightColor, (normalizedHeight - 0.58) / 0.34);
    else mixedColor.lerpColors(highlightColor, specularColor, (normalizedHeight - 0.92) / 0.08);

    const scaleY = 1 + heights[index] / baseHeight;
    dummy.position.set(x, (baseHeight * scaleY) / 2, z);
    dummy.scale.set(1, scaleY, 1);
    dummy.updateMatrix();
    grid.setMatrixAt(index, dummy.matrix);
    grid.setColorAt(index, mixedColor);
  }
  grid.instanceMatrix.needsUpdate = true;
  if (grid.instanceColor) grid.instanceColor.needsUpdate = true;
}

function renderFrame(timestamp: number) {
  if (!renderer || !scene || !camera || !visible) return;
  const delta = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;
  if (dynamicEnabled) updateGrid(delta);
  renderer.render(scene, camera);
  if (dynamicEnabled || trail.length) rafId = window.requestAnimationFrame(renderFrame);
}

function startRendering() {
  if (!renderer || !scene || !camera || !visible || rafId) return;
  lastFrame = performance.now();
  rafId = window.requestAnimationFrame(renderFrame);
}

function stopRendering() {
  if (!rafId) return;
  window.cancelAnimationFrame(rafId);
  rafId = 0;
}

function resize() {
  if (!renderer || !camera || !rootEl.value) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  trail = [];
  buildGrid();
  renderer.render(scene!, camera);
  if (dynamicEnabled) startRendering();
}

function handleVisibilityChange() {
  visible = document.visibilityState === 'visible';
  if (visible) startRendering();
  else stopRendering();
}

function handleContextLost(event: Event) {
  event.preventDefault();
  failed.value = true;
  dispose();
}

function initialize() {
  if (!rootEl.value) return;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(COLORS.sceneBackground, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    rootEl.value.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLORS.sceneBackground, 0.045);
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 80);
    camera.position.set(0, 8.5, 11.8);
    camera.lookAt(0, 0, 0.6);
    scene.add(new THREE.HemisphereLight(COLORS.ambientLight, COLORS.cubeShadow, 1.45));
    const keyLight = new THREE.DirectionalLight(COLORS.directionalLight, 1.7);
    keyLight.position.set(-8, 12, 7);
    scene.add(keyLight);
    buildGrid();
    resize();
    renderer.render(scene, camera);
    ready.value = true;
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('blur', handlePointerLeave);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (dynamicEnabled) startRendering();
  } catch (_error) {
    failed.value = true;
    dispose();
  }
}

function dispose() {
  stopRendering();
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerleave', handlePointerLeave);
  window.removeEventListener('blur', handlePointerLeave);
  window.removeEventListener('resize', resize);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  renderer?.domElement.removeEventListener('webglcontextlost', handleContextLost);
  disposeGrid();
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
  renderer = null;
  scene = null;
  camera = null;
  trail = [];
}

onMounted(initialize);
onBeforeUnmount(dispose);
</script>

<template>
  <div ref="rootEl" class="wavy-cubes-background" :class="{ 'is-ready': ready, 'is-fallback': failed }" aria-hidden="true"></div>
</template>
