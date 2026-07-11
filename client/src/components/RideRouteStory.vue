<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

type Coordinate = [number, number] | [number, number, number];
type CameraState = { x: number; y: number; scale: number };
type RouteStoryPlan = {
  request: { start: { latitude: number; longitude: number }; end: { latitude: number; longitude: number } };
  route: { profile: string; distanceKm: number; durationMinutes: number; elevationGainM: number | null; elevationLossM: number | null; geometry: { type: string; coordinates: Coordinate[] }; bbox: number[] | null };
  weather: { forecastTime: string; sampleLocation: { strategy: string }; temperatureC: number; apparentTemperatureC: number; rainProbability: number; precipitationMm: number; windSpeedKph: number; windGustKph: number };
  recommendation: { score: number; level: 'recommended' | 'suitable' | 'caution' | 'not_recommended'; reasons: string[]; warnings: string[]; factors: { code: string; impact: number; message: string }[] };
  attribution?: string;
};

const props = defineProps<{ plan: RouteStoryPlan; startLabel: string; endLabel: string }>();

const storyEl = ref<HTMLElement | null>(null);
const mapColumnEl = ref<HTMLElement | null>(null);
const mapFrameEl = ref<HTMLElement | null>(null);
const mapEl = ref<HTMLElement | null>(null);
const cameraEl = ref<HTMLElement | null>(null);
const overlayEl = ref<SVGSVGElement | null>(null);
const basePathEl = ref<SVGPathElement | null>(null);
const progressPathEl = ref<SVGPathElement | null>(null);
const riderEl = ref<SVGGElement | null>(null);
const startMarkerEl = ref<SVGGElement | null>(null);
const endMarkerEl = ref<SVGGElement | null>(null);
const expandedMapEl = ref<HTMLElement | null>(null);
const expandButtonEl = ref<HTMLButtonElement | null>(null);
const chapterStatusEl = ref<HTMLElement | null>(null);
const storyError = ref('');
const expanded = ref(false);
const activeChapter = ref(0);
const reducedMotion = ref(false);

let storyMap: any = null;
let expandedMap: any = null;
let storyTimeline: any = null;
let storyMedia: any = null;
let storyContext: gsap.Context | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let projectedPoints: { x: number; y: number }[] = [];
let routeLength = 0;
let rebuildProgress = 0;
let storyProgress = 0;
let bodyOverflow = '';

const routeCoordinates = computed(() => {
  const coordinates = props.plan.route.geometry?.coordinates || [];
  return coordinates.filter((coordinate): coordinate is Coordinate => Array.isArray(coordinate)
    && coordinate.length >= 2
    && Number.isFinite(coordinate[0])
    && Number.isFinite(coordinate[1])
    && coordinate[0] >= -180
    && coordinate[0] <= 180
    && coordinate[1] >= -90
    && coordinate[1] <= 90);
});

const routeAvailable = computed(() => props.plan.route.geometry?.type === 'LineString' && routeCoordinates.value.length >= 2);
const chapters = computed(() => [
  {
    eyebrow: 'Chapter 01',
    title: 'Route overview',
    detail: `${props.startLabel} to ${props.endLabel}`,
    metrics: [
      { label: 'Distance', value: `${props.plan.route.distanceKm.toFixed(2)} km` },
      { label: 'Duration', value: formatDuration(props.plan.route.durationMinutes) },
      { label: 'Climb', value: metric(props.plan.route.elevationGainM, ' m') },
      { label: 'Descent', value: metric(props.plan.route.elevationLossM, ' m') }
    ],
    note: props.plan.route.profile
  },
  {
    eyebrow: 'Chapter 02',
    title: 'Departure weather',
    detail: '起点天气',
    metrics: [
      { label: 'Temperature', value: `${props.plan.weather.temperatureC}°C` },
      { label: 'Feels like', value: `${props.plan.weather.apparentTemperatureC}°C` },
      { label: 'Rain risk', value: `${props.plan.weather.rainProbability}%` },
      { label: 'Wind', value: `${props.plan.weather.windSpeedKph} kph` }
    ],
    note: `${props.plan.weather.precipitationMm} mm precipitation · gusts ${props.plan.weather.windGustKph} kph · ${formatForecast(props.plan.weather.forecastTime)}`
  },
  {
    eyebrow: 'Chapter 03',
    title: 'Final call',
    detail: levelLabel(props.plan.recommendation.level),
    metrics: [{ label: 'Recommendation', value: `${props.plan.recommendation.score} / 100` }],
    note: ''
  }
]);

const activeStoryChapter = computed(() => chapters.value[activeChapter.value]);
const visibleFactors = computed(() => props.plan.recommendation.factors.slice(0, 4));
const visibleReasons = computed(() => props.plan.recommendation.reasons.slice(0, 2));
const visibleWarnings = computed(() => props.plan.recommendation.warnings.slice(0, 2));

function formatDuration(minutes: number) {
  const whole = Math.round(minutes);
  return whole >= 60 ? `${Math.floor(whole / 60)}h ${whole % 60}m` : `${whole} min`;
}

function metric(value: number | null, suffix: string) {
  return value === null ? 'Unknown' : `${value}${suffix}`;
}

function formatForecast(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function levelLabel(level: RouteStoryPlan['recommendation']['level']) {
  return { recommended: '推荐', suitable: '适合', caution: '谨慎', not_recommended: '不建议' }[level];
}

function sampledCoordinates() {
  const coordinates = routeCoordinates.value;
  if (coordinates.length <= 800) return coordinates;
  const stride = Math.ceil((coordinates.length - 1) / 799);
  const sampled = coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1 || index % stride === 0);
  return sampled;
}

function latLngs() {
  return sampledCoordinates().map(([longitude, latitude]) => [latitude, longitude]);
}

function buildPathData(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function setMarkerPosition(marker: SVGElement | null, point: { x: number; y: number } | undefined) {
  if (!marker || !point) return;
  marker.setAttribute('transform', `translate(${point.x} ${point.y})`);
}

function projectRoute() {
  if (!storyMap || !overlayEl.value || !basePathEl.value || !progressPathEl.value || !routeAvailable.value) return;
  const mapSize = storyMap.getSize();
  projectedPoints = latLngs().map(([latitude, longitude]) => storyMap.latLngToContainerPoint([latitude, longitude]));
  if (projectedPoints.length < 2) {
    storyError.value = '路线数据已生成，但地图叙事暂时无法显示。';
    return;
  }
  const pathData = buildPathData(projectedPoints);
  overlayEl.value.setAttribute('viewBox', `0 0 ${mapSize.x} ${mapSize.y}`);
  overlayEl.value.setAttribute('width', String(mapSize.x));
  overlayEl.value.setAttribute('height', String(mapSize.y));
  basePathEl.value.setAttribute('d', pathData);
  progressPathEl.value.setAttribute('d', pathData);
  setMarkerPosition(startMarkerEl.value, projectedPoints[0]);
  setMarkerPosition(endMarkerEl.value, projectedPoints[projectedPoints.length - 1]);
  routeLength = progressPathEl.value.getTotalLength();
  if (!Number.isFinite(routeLength) || routeLength <= 0) {
    storyError.value = '路线数据已生成，但地图叙事暂时无法显示。';
    return;
  }
  storyError.value = '';
}

function pointAt(progress: number) {
  if (!progressPathEl.value || !routeLength) return null;
  return progressPathEl.value.getPointAtLength(Math.max(0, Math.min(1, progress)) * routeLength);
}

function cameraTarget(progress: number): CameraState {
  const frame = mapFrameEl.value;
  if (!frame || !routeLength) return { x: 0, y: 0, scale: 1 };
  let focusProgress = 0.5;
  let scale = 1.2;
  if (progress < 0.12) return { x: 0, y: 0, scale: 1 };
  if (progress < 0.46) { focusProgress = 0.27; scale = 1.26; }
  else if (progress < 0.75) { focusProgress = 0.55; scale = 1.36; }
  else if (progress < 0.92) { focusProgress = 0.88; scale = 1.26; }
  else {
    const returnProgress = (progress - 0.92) / 0.08;
    const end = cameraTarget(0.9);
    return { x: end.x * (1 - returnProgress), y: end.y * (1 - returnProgress), scale: end.scale + (1 - end.scale) * returnProgress };
  }
  const point = pointAt(focusProgress);
  if (!point) return { x: 0, y: 0, scale: 1 };
  const width = frame.clientWidth;
  const height = frame.clientHeight;
  const maxX = (width * (scale - 1)) / 2;
  const maxY = (height * (scale - 1)) / 2;
  const x = Math.max(-maxX, Math.min(maxX, (width / 2 - point.x) * scale));
  const y = Math.max(-maxY, Math.min(maxY, (height / 2 - point.y) * scale));
  return { x, y, scale };
}

function updateChapter(progress: number) {
  const nextChapter = progress < 0.46 ? 0 : progress < 0.75 ? 1 : 2;
  if (nextChapter === activeChapter.value) return;
  activeChapter.value = nextChapter;
}

function updateStoryProgress(progress: number) {
  storyProgress = progress;
  chapterStatusEl.value?.style.setProperty('--story-progress', `${progress * 100}%`);
}

function applyCamera(progress: number) {
  const camera = cameraEl.value;
  if (!camera) return;
  const target = cameraTarget(progress);
  gsap.set(camera, { x: target.x, y: target.y, scale: target.scale, transformOrigin: '50% 50%' });
  updateChapter(progress);
}

function setupStoryAnimation(initialProgress = 0) {
  if (!storyEl.value || !mapColumnEl.value || !mapFrameEl.value || !progressPathEl.value || !riderEl.value || !endMarkerEl.value || !routeLength) return;
  storyTimeline?.kill();
  storyMedia?.revert();
  storyContext?.revert();
  storyContext = gsap.context(() => {
    storyMedia = gsap.matchMedia();
    storyMedia.add({ desktop: '(min-width: 900px)', compact: '(max-width: 899px)', reduce: '(prefers-reduced-motion: reduce)' }, (context: any) => {
    const { desktop, reduce } = context.conditions;
    reducedMotion.value = reduce;
    if (reduce) {
      gsap.set(progressPathEl.value, { drawSVG: '0% 100%' });
      const endPoint = pointAt(1);
      setMarkerPosition(riderEl.value, endPoint || undefined);
      gsap.set(endMarkerEl.value, { autoAlpha: 1 });
      gsap.set(cameraEl.value, { x: 0, y: 0, scale: 1, clearProps: 'transformOrigin' });
      activeChapter.value = 0;
      updateStoryProgress(1);
      return;
    }
    gsap.set(progressPathEl.value, { drawSVG: '0% 0%' });
    gsap.set(riderEl.value, { autoAlpha: 1 });
    gsap.set(endMarkerEl.value, { autoAlpha: 0.42 });
    gsap.set(mapFrameEl.value, { transformOrigin: '50% 50%', willChange: 'transform' });
    activeChapter.value = 0;
    updateStoryProgress(initialProgress);
    storyTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: storyEl.value,
        start: desktop ? 'top top+=24' : 'top top+=12',
        end: () => `+=${Math.round(window.innerHeight * (desktop ? 1.9 : 1.25))}`,
        pin: mapColumnEl.value,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self: any) => {
          updateStoryProgress(self.progress);
          applyCamera(self.progress);
        },
        markers: false
      }
    });
    storyTimeline.to(progressPathEl.value, { drawSVG: '0% 100%', duration: 1 }, 0)
      .to(riderEl.value, { motionPath: { path: progressPathEl.value, align: progressPathEl.value, alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 1, immediateRender: true }, 0)
      .to(endMarkerEl.value, { autoAlpha: 1, duration: 0.2 }, 0.76)
      // Pin the stable stage, then move only this child frame. The three chapters
      // stay visibly distinct without putting a transformed ancestor above the pin.
      .to(mapFrameEl.value, { scale: 0.88, x: 48, y: 10, duration: 0.46 }, 0)
      .to(mapFrameEl.value, { scale: 0.76, x: 104, y: 26, duration: 0.29 }, 0.46)
      .to(mapFrameEl.value, { scale: 0.9, x: 38, y: 10, duration: 0.25 }, 0.75);
    storyTimeline.progress(initialProgress);
    applyCamera(initialProgress);
    });
  }, storyEl.value);
}

function resizeStory() {
  if (!storyMap) return;
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    rebuildProgress = storyTimeline?.progress() || 0;
    storyMap.invalidateSize({ animate: false });
    requestAnimationFrame(() => {
      projectRoute();
      setupStoryAnimation(rebuildProgress);
      ScrollTrigger.refresh();
    });
  }, 120);
}

function initializeMap() {
  if (!mapEl.value || !routeAvailable.value) return;
  try {
    storyMap = L.map(mapEl.value, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false, boxZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(storyMap);
    storyMap.fitBounds(latLngs(), { padding: [26, 26], maxZoom: 14 });
    storyMap.once('moveend', () => requestAnimationFrame(() => {
      storyMap.invalidateSize({ animate: false });
      projectRoute();
      setupStoryAnimation();
      ScrollTrigger.refresh();
    }));
    setTimeout(() => {
      if (!routeLength) {
        projectRoute();
        setupStoryAnimation();
        ScrollTrigger.refresh();
      }
    }, 120);
    storyMap.on('moveend zoomend', projectRoute);
    resizeObserver = new ResizeObserver(resizeStory);
    if (mapFrameEl.value) resizeObserver.observe(mapFrameEl.value);
  } catch (_error) {
    storyError.value = '路线数据已生成，但地图叙事暂时无法显示。';
  }
}

function clearStory() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  storyTimeline?.kill();
  storyTimeline = null;
  storyMedia?.revert();
  storyMedia = null;
  storyContext?.revert();
  storyContext = null;
  if (storyMap) {
    storyMap.off();
    storyMap.remove();
    storyMap = null;
  }
  routeLength = 0;
  projectedPoints = [];
}

function openExpandedMap() {
  if (!routeAvailable.value) return;
  expanded.value = true;
  bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  nextTick(() => {
    if (!expandedMapEl.value) return;
    expandedMap = L.map(expandedMapEl.value, { zoomControl: true, attributionControl: true, dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true, keyboard: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(expandedMap);
    const points = latLngs();
    L.polyline(points, { color: '#cdae54', weight: 4, opacity: 0.92 }).addTo(expandedMap);
    L.circleMarker(points[0], { radius: 7, color: '#a9c98b', weight: 2, fillColor: '#151512', fillOpacity: 1 }).addTo(expandedMap);
    L.circleMarker(points[points.length - 1], { radius: 7, color: '#cdae54', weight: 2, fillColor: '#201d13', fillOpacity: 1 }).addTo(expandedMap);
    L.circleMarker(points[Math.floor((points.length - 1) * 0.5)], { radius: 5, color: '#cdae54', weight: 2, fillColor: '#f1ede3', fillOpacity: 1 }).addTo(expandedMap);
    expandedMap.fitBounds(points, { padding: [44, 44], maxZoom: 14 });
    setTimeout(() => expandedMap?.invalidateSize(), 0);
  });
}

function closeExpandedMap() {
  if (!expanded.value) return;
  expandedMap?.remove();
  expandedMap = null;
  expanded.value = false;
  document.body.style.overflow = bodyOverflow;
  nextTick(() => expandButtonEl.value?.focus());
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && expanded.value) closeExpandedMap();
}

async function initializeStory() {
  clearStory();
  storyError.value = routeAvailable.value ? '' : '路线数据已生成，但地图叙事暂时无法显示。';
  if (!routeAvailable.value) return;
  await nextTick();
  initializeMap();
}

watch(() => props.plan, initializeStory);
onMounted(() => {
  document.addEventListener('keydown', onEscape);
  initializeStory();
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEscape);
  closeExpandedMap();
  clearStory();
});
</script>

<template>
  <section ref="storyEl" class="route-story" aria-label="Route story">
    <header class="route-story-heading"><div><p class="eyebrow">Route story / 路线故事</p><h2>{{ startLabel }} to {{ endLabel }}</h2><p>沿真实路线查看出发天气与骑行建议。</p></div></header>
    <p v-if="storyError" class="route-story-error">{{ storyError }}</p>
    <div v-else ref="mapColumnEl" class="route-story-stage">
      <div ref="mapFrameEl" class="route-story-map-frame">
        <div ref="cameraEl" class="route-story-camera"><div ref="mapEl" class="route-story-leaflet"></div><svg ref="overlayEl" class="route-story-overlay" aria-hidden="true"><path ref="basePathEl" class="route-base-path"/><path ref="progressPathEl" class="route-progress-path"/><g ref="startMarkerEl" class="route-marker route-start-marker"><circle r="7"/><circle class="route-marker-core" r="2.5"/><text x="11" y="-9">START</text></g><g ref="endMarkerEl" class="route-marker route-end-marker"><circle r="7"/><circle class="route-marker-core" r="2.5"/><text x="11" y="-9">END</text></g><g ref="riderEl" class="route-rider"><circle class="route-rider-halo" r="10"/><circle class="route-rider-core" r="6"/><path d="M-2.5 -3.5 L4.5 0 L-2.5 3.5 Z"/></g></svg></div>
        <div class="route-story-map-shade" aria-hidden="true"></div>
      </div>
        <div class="route-story-top-overlay"><div><p class="eyebrow">Route story</p><strong>{{ startLabel }} <span>→</span> {{ endLabel }}</strong></div><button ref="expandButtonEl" type="button" class="ghost compact" :disabled="!routeAvailable" @click="openExpandedMap">Expand Map</button></div>
        <section class="route-story-copy" aria-live="polite"><Transition name="story-copy" mode="out-in"><article :key="activeStoryChapter.title"><p class="eyebrow">{{ activeStoryChapter.eyebrow }}</p><h3>{{ activeStoryChapter.title }}</h3><strong>{{ activeStoryChapter.detail }}</strong><div class="route-story-metrics"><div v-for="item in activeStoryChapter.metrics" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></div></div><p v-if="activeStoryChapter.note" class="route-story-note">{{ activeStoryChapter.note }}</p><template v-if="activeChapter === 2"><p v-for="reason in visibleReasons" :key="reason" class="route-story-reason">{{ reason }}</p><p v-for="warning in visibleWarnings" :key="warning" class="route-story-warning">{{ warning }}</p><div v-if="visibleFactors.length" class="story-factors"><div v-for="factor in visibleFactors" :key="factor.code" :class="factor.impact >= 0 ? 'positive' : 'negative'"><span>{{ factor.message }}</span><b>{{ factor.impact > 0 ? '+' : '' }}{{ factor.impact }}</b></div></div><p class="story-disclaimer">建议基于路线、天气和骑行目标的规则评估，不构成安全保证。</p></template></article></Transition></section>
        <div ref="chapterStatusEl" class="route-story-chapter-status" aria-label="Route story progress"><span v-for="(chapter, index) in chapters" :key="chapter.title" :class="{ active: activeChapter === index }"><b>0{{ index + 1 }}</b><i>{{ index === 0 ? 'Route' : index === 1 ? 'Weather' : 'Call' }}</i></span></div>
        <p class="route-story-attribution">© OpenStreetMap contributors</p>
    </div>
    <div v-if="expanded" class="expanded-map-backdrop" role="dialog" aria-modal="true" aria-label="Expanded route map"><div class="expanded-map-shell"><header><div><p class="eyebrow">Full route view</p><h2>{{ startLabel }} to {{ endLabel }}</h2></div><button type="button" class="ghost compact" @click="closeExpandedMap">Close Map</button></header><div ref="expandedMapEl" class="expanded-leaflet-map"></div></div></div>
  </section>
</template>
