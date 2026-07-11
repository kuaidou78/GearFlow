<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import wavyCubesVertex from '../shaders/wavyCubesVertex';
import wavyCubesFragment from '../shaders/wavyCubesFragment';

const rootEl = ref<HTMLElement | null>(null);
const ready = ref(false);
const failed = ref(false);

const TRAIL_SAMPLES = 24;
const COLORS = {
  scene: '#080A08',
  cubeBase: '#686B5E',
  cubeSide: '#34372F',
  rippleOuter: '#A08F4C',
  waveMid: '#C2A42E',
  waveHighlight: '#EED13D',
  peakHighlight: '#FFF0A6'
};

type TrailPoint = { x: number; z: number; age: number; strength: number; source: 'pointer' | 'ambient' };

let THREE: any = null;
let renderer: any = null;
let scene: any = null;
let camera: any = null;
let grid: any = null;
let geometry: any = null;
let material: any = null;
let trailTexture: any = null;
let rafId = 0;
let lastFrame = 0;
let visible = true;
let dynamicEnabled = false;
let trail: TrailPoint[] = [];
let trailData: Float32Array | null = null;
let offsets: Float32Array | null = null;
let gridWidth = 0;
let gridDepth = 0;
let raycaster: any = null;
let pointerNdc: any = null;
let pointerWorld: any = null;
let groundPlane: any = null;
let ambientTimer: ReturnType<typeof window.setTimeout> | null = null;
let lastPointerAt = 0;

function gridSettings() {
  if (window.innerWidth < 768) return { columns: 28, rows: 22, dynamic: false, waveHeight: 0.18 };
  if (window.innerWidth < 1100) return { columns: 44, rows: 32, dynamic: true, waveHeight: 0.34 };
  return { columns: 58, rows: 40, dynamic: true, waveHeight: 0.42 };
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function disposeGrid() {
  if (grid && scene) scene.remove(grid);
  geometry?.dispose();
  material?.dispose();
  trailTexture?.dispose();
  grid = null;
  geometry = null;
  material = null;
  trailTexture = null;
  trailData = null;
  offsets = null;
}

function buildGrid() {
  if (!scene || !THREE) return;
  disposeGrid();
  const settings = gridSettings();
  dynamicEnabled = settings.dynamic && !reducedMotion();
  const count = settings.columns * settings.rows;
  const cubeSize = window.innerWidth < 768 ? 0.3 : 0.34;
  const gap = window.innerWidth < 768 ? 0.016 : 0.02;
  const spacing = cubeSize + gap;
  const baseHeight = window.innerWidth < 768 ? 0.3 : 0.34;
  const xOffset = ((settings.columns - 1) * spacing) / 2;
  const zOffset = ((settings.rows - 1) * spacing) / 2;
  gridWidth = settings.columns * spacing;
  gridDepth = settings.rows * spacing;
  offsets = new Float32Array(count * 2);
  trailData = new Float32Array(TRAIL_SAMPLES * 4);
  trailTexture = new THREE.DataTexture(trailData, TRAIL_SAMPLES, 1, THREE.RGBAFormat, THREE.FloatType);
  trailTexture.needsUpdate = true;
  trailTexture.magFilter = THREE.NearestFilter;
  trailTexture.minFilter = THREE.NearestFilter;
  trailTexture.generateMipmaps = false;

  geometry = new THREE.BoxGeometry(cubeSize, baseHeight, cubeSize);
  const offsetAttribute = new THREE.InstancedBufferAttribute(offsets, 2);
  geometry.setAttribute('aOffset', offsetAttribute);
  material = new THREE.ShaderMaterial({
    vertexShader: wavyCubesVertex,
    fragmentShader: wavyCubesFragment,
    uniforms: {
      uTrailTexture: { value: trailTexture },
      uTrailCount: { value: 0 },
      uTrailLifetime: { value: 1.18 },
      uWaveRadius: { value: window.innerWidth < 1100 ? 0.98 : 1.14 },
      uWaveHeight: { value: settings.waveHeight },
      uCubeBase: { value: new THREE.Color(COLORS.cubeBase) },
      uCubeSide: { value: new THREE.Color(COLORS.cubeSide) },
      uRippleOuter: { value: new THREE.Color(COLORS.rippleOuter) },
      uWaveMid: { value: new THREE.Color(COLORS.waveMid) },
      uWaveHighlight: { value: new THREE.Color(COLORS.waveHighlight) },
      uPeakHighlight: { value: new THREE.Color(COLORS.peakHighlight) }
    }
  });
  grid = new THREE.InstancedMesh(geometry, material, count);
  grid.frustumCulled = false;
  const dummy = new THREE.Object3D();
  for (let row = 0; row < settings.rows; row += 1) {
    for (let column = 0; column < settings.columns; column += 1) {
      const index = row * settings.columns + column;
      const x = column * spacing - xOffset;
      const z = row * spacing - zOffset;
      offsets[index * 2] = x;
      offsets[index * 2 + 1] = z;
      dummy.position.set(x, baseHeight / 2, z);
      dummy.updateMatrix();
      grid.setMatrixAt(index, dummy.matrix);
    }
  }
  grid.instanceMatrix.needsUpdate = true;
  offsetAttribute.needsUpdate = true;
  scene.add(grid);
}

function uploadTrail() {
  if (!trailData || !trailTexture || !material) return;
  const data = trailData;
  data.fill(0);
  const visiblePoints = trail.slice(-TRAIL_SAMPLES);
  visiblePoints.forEach((point, index) => {
    const offset = index * 4;
    data[offset] = point.x;
    data[offset + 1] = point.z;
    data[offset + 2] = point.age;
    data[offset + 3] = point.strength;
  });
  trailTexture.needsUpdate = true;
  material.uniforms.uTrailCount.value = visiblePoints.length;
}

function addTrailPoint(x: number, z: number, strength = 1, source: TrailPoint['source'] = 'pointer', force = false) {
  const previous = trail[trail.length - 1];
  const distance = previous ? Math.hypot(x - previous.x, z - previous.z) : 0.3;
  if (!force && previous && previous.source === source && distance < 0.1) return;
  const movementStrength = Math.min(0.76, Math.max(0.34, distance / 0.64));
  const segments = source === 'pointer' && previous?.source === 'pointer'
    ? Math.min(6, Math.max(1, Math.ceil(distance / 0.3)))
    : 1;
  for (let index = 1; index <= segments; index += 1) {
    const progress = index / segments;
    trail.push({
      x: previous ? previous.x + (x - previous.x) * progress : x,
      z: previous ? previous.z + (z - previous.z) * progress : z,
      // Older points lead the path so their ripple has already propagated by the next sample.
      age: source === 'pointer' ? (segments - index) * 0.08 : 0,
      strength: source === 'pointer' ? movementStrength : strength,
      source
    });
    if (trail.length > TRAIL_SAMPLES) trail.shift();
  }
  uploadTrail();
  startRendering();
}

function onPointerMove(event: PointerEvent) {
  if (!dynamicEnabled || !camera) return;
  lastPointerAt = performance.now();
  pointerNdc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, pointerWorld)) return;
  if (Math.abs(pointerWorld.x) > gridWidth * 0.58 || Math.abs(pointerWorld.z) > gridDepth * 0.58) return;
  addTrailPoint(pointerWorld.x, pointerWorld.z);
}

function onPointerExit() {
  // The data texture decays in the animation loop; no synthetic points are added.
}

function clearAmbientTimer() {
  if (ambientTimer === null) return;
  window.clearTimeout(ambientTimer);
  ambientTimer = null;
}

function scheduleAmbientRipple() {
  clearAmbientTimer();
  if (!dynamicEnabled || !visible || reducedMotion() || window.innerWidth < 768) return;
  const delay = 2800 + Math.random() * 4200;
  ambientTimer = window.setTimeout(() => {
    ambientTimer = null;
    const isPointerIdle = performance.now() - lastPointerAt > 1800;
    const activeAmbient = trail.some((point) => point.source === 'ambient');
    if (isPointerIdle && !activeAmbient) {
      const x = (Math.random() - 0.5) * gridWidth * 0.62;
      const z = (Math.random() - 0.5) * gridDepth * 0.62;
      addTrailPoint(x, z, 0.2 + Math.random() * 0.09, 'ambient', true);
    }
    scheduleAmbientRipple();
  }, delay);
}

function updateTrail(delta: number) {
  if (!trail.length) return;
  const lifetime = material?.uniforms.uTrailLifetime.value || 1.15;
  let changed = false;
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    trail[index].age += delta;
    if (trail[index].age > lifetime) trail.splice(index, 1);
    changed = true;
  }
  if (changed) uploadTrail();
}

function renderFrame(timestamp: number) {
  if (!renderer || !scene || !camera || !visible) return;
  const delta = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;
  updateTrail(delta);
  renderer.render(scene, camera);
  if (trail.length) rafId = window.requestAnimationFrame(renderFrame);
  else rafId = 0;
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
  if (!renderer || !camera) return;
  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = window.innerWidth < 768 ? 9.4 : 10.6;
  camera.left = (-viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  trail = [];
  buildGrid();
  renderer.render(scene, camera);
  scheduleAmbientRipple();
}

function onVisibilityChange() {
  visible = document.visibilityState === 'visible';
  if (visible) {
    if (trail.length) startRendering();
    scheduleAmbientRipple();
  } else {
    clearAmbientTimer();
    stopRendering();
  }
}

function onContextLost(event: Event) {
  event.preventDefault();
  failed.value = true;
  dispose();
}

async function initialize() {
  if (!rootEl.value) return;
  try {
    THREE = await import('three');
    raycaster = new THREE.Raycaster();
    pointerNdc = new THREE.Vector2();
    pointerWorld = new THREE.Vector3();
    groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(COLORS.scene, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
    rootEl.value.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 80);
    camera.position.set(0, 10.8, 2.4);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    buildGrid();
    resize();
    renderer.render(scene, camera);
    ready.value = true;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerExit, { passive: true });
    window.addEventListener('blur', onPointerExit);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    lastPointerAt = performance.now();
    scheduleAmbientRipple();
  } catch (_error) {
    failed.value = true;
    dispose();
  }
}

function dispose() {
  stopRendering();
  clearAmbientTimer();
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerleave', onPointerExit);
  window.removeEventListener('blur', onPointerExit);
  window.removeEventListener('resize', resize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
  disposeGrid();
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
  renderer = null;
  scene = null;
  camera = null;
  trail = [];
}

onMounted(() => { void initialize(); });
onBeforeUnmount(dispose);
</script>

<template>
  <div ref="rootEl" class="wavy-cubes-background" :class="{ 'is-ready': ready, 'is-fallback': failed }" aria-hidden="true"></div>
</template>
