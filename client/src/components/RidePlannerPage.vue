<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { get, post } from '../api';

type Place = { id: string; label: string; name: string | null; locality: string | null; region: string | null; country: string | null; latitude: number; longitude: number; source: 'openrouteservice' };
type PlaceSearchResponse = { query: string; places: Place[]; attribution: string };
type RideType = 'recovery' | 'casual' | 'endurance' | 'climbing';
type PlanResponse = {
  request: { departureTime: string; rideType: RideType };
  route: { profile: string; distanceKm: number; durationMinutes: number; elevationGainM: number | null; elevationLossM: number | null; geometry: { type: 'LineString'; coordinates: number[][] } };
  weather: { forecastTime: string; sampleLocation: { strategy: string }; temperatureC: number; apparentTemperatureC: number; rainProbability: number; precipitationMm: number; windSpeedKph: number; windGustKph: number };
  recommendation: { score: number; level: 'recommended' | 'suitable' | 'caution' | 'not_recommended'; reasons: string[]; warnings: string[]; factors: { code: string; impact: number; message: string }[] };
  sources: { route: string; weather: string };
  attribution?: string;
};
type FieldKey = 'start' | 'end';
type PlaceField = { text: string; selected: Place | null; places: Place[]; open: boolean; loading: boolean; error: string; empty: boolean; activeIndex: number };

const fieldKeys: FieldKey[] = ['start', 'end'];
const focus = { latitude: 29.82, longitude: 106.42 };
const rideTypeOptions: { value: RideType; label: string; detail: string }[] = [
  { value: 'recovery', label: '恢复骑', detail: '短距离、低负荷' },
  { value: 'casual', label: '轻松巡航', detail: '舒适节奏与中短距离' },
  { value: 'endurance', label: '耐力骑', detail: '稳定的长时间负荷' },
  { value: 'climbing', label: '爬坡训练', detail: '以爬升与节奏为重点' }
];
const levelLabels = { recommended: '推荐', suitable: '适合', caution: '谨慎', not_recommended: '不建议' };
const fields = reactive<Record<FieldKey, PlaceField>>({
  start: createPlaceField(),
  end: createPlaceField()
});
const departureLocal = ref(nextWholeHour());
const rideType = ref<RideType>('casual');
const formError = ref('');
const planError = ref('');
const planning = ref(false);
const refreshing = ref(false);
const plan = ref<PlanResponse | null>(null);
const minDeparture = ref(localDateTime(new Date()));
const maxDeparture = ref(localDateTime(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)));
const searchTimers: Partial<Record<FieldKey, ReturnType<typeof setTimeout>>> = {};
const searchControllers: Partial<Record<FieldKey, AbortController>> = {};
const searchSequences = reactive<Record<FieldKey, number>>({ start: 0, end: 0 });
let planController: AbortController | null = null;

const canGenerate = computed(() => Boolean(fields.start.selected && fields.end.selected && departureLocal.value && !planning.value));

function createPlaceField(): PlaceField {
  return { text: '', selected: null, places: [], open: false, loading: false, error: '', empty: false, activeIndex: 0 };
}

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextWholeHour() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return localDateTime(date);
}

function toOffsetIso(localValue: string) {
  const date = new Date(localValue);
  const pad = (value: number) => String(Math.abs(value)).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
  return `${localValue}:00${offset}`;
}

function handlePlaceInput(key: FieldKey) {
  const field = fields[key];
  field.selected = null;
  field.error = '';
  field.empty = false;
  field.activeIndex = 0;
  clearSearch(key);
  if (field.text.trim().length < 2) {
    field.places = [];
    field.open = false;
    return;
  }
  searchTimers[key] = setTimeout(() => searchPlaces(key), 400);
}

function clearSearch(key: FieldKey) {
  if (searchTimers[key]) clearTimeout(searchTimers[key]);
  searchTimers[key] = undefined;
  searchControllers[key]?.abort();
  searchControllers[key] = undefined;
}

async function searchPlaces(key: FieldKey) {
  const field = fields[key];
  const query = field.text.trim();
  if (query.length < 2) return;
  const sequence = ++searchSequences[key];
  const controller = new AbortController();
  searchControllers[key]?.abort();
  searchControllers[key] = controller;
  field.loading = true;
  field.error = '';
  field.empty = false;
  field.open = true;

  try {
    const params = new URLSearchParams({ q: query, limit: '5', focusLatitude: String(focus.latitude), focusLongitude: String(focus.longitude) });
    const response = await get<PlaceSearchResponse>(`/api/ride-planner/places/search?${params.toString()}`, { signal: controller.signal });
    if (sequence !== searchSequences[key]) return;
    field.places = response.data.places;
    field.empty = !field.places.length;
    field.activeIndex = 0;
  } catch (error) {
    if (controller.signal.aborted || sequence !== searchSequences[key]) return;
    field.places = [];
    field.error = '地点搜索暂时不可用，请稍后重试。';
  } finally {
    if (sequence === searchSequences[key]) field.loading = false;
  }
}

function selectPlace(key: FieldKey, place: Place) {
  const field = fields[key];
  field.selected = place;
  field.text = place.label;
  field.open = false;
  field.places = [];
  field.empty = false;
  field.error = '';
  formError.value = '';
}

function handlePlaceKeydown(key: FieldKey, event: KeyboardEvent) {
  const field = fields[key];
  if (event.key === 'ArrowDown' && field.places.length) {
    event.preventDefault();
    field.open = true;
    field.activeIndex = (field.activeIndex + 1) % field.places.length;
  } else if (event.key === 'ArrowUp' && field.places.length) {
    event.preventDefault();
    field.open = true;
    field.activeIndex = (field.activeIndex - 1 + field.places.length) % field.places.length;
  } else if (event.key === 'Enter' && field.open && field.places[field.activeIndex]) {
    event.preventDefault();
    selectPlace(key, field.places[field.activeIndex]);
  } else if (event.key === 'Escape') {
    field.open = false;
  }
}

function closePlaceLists(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('.place-search')) fieldKeys.forEach((key) => { fields[key].open = false; });
}

function validatePlan() {
  const start = fields.start.selected;
  const end = fields.end.selected;
  if (!start || !end) return '请从候选地点中选择起点和终点。';
  if (start.latitude === end.latitude && start.longitude === end.longitude) return '起点和终点不能是同一地点。';
  const departure = new Date(departureLocal.value);
  if (!departureLocal.value || Number.isNaN(departure.getTime()) || departure.getTime() < Date.now() - 60 * 1000) return '请选择当前时间之后的出发时间。';
  if (departure.getTime() > new Date(maxDeparture.value).getTime()) return '出发时间超出当前可用天气预报范围。';
  return '';
}

function userFacingPlanError(message: string) {
  if (/Route provider could not find|route/i.test(message)) return '当前起终点无法生成公路骑行路线，请调整地点后重试。';
  if (/Weather|forecast|departureTime/i.test(message)) return '出发时间的天气数据不可用，请选择较近的未来时间。';
  if (/configured|authentication|rate limit/i.test(message)) return '规划服务暂时不可用，请稍后重试。';
  return '生成计划失败，请检查地点和出发时间后重试。';
}

async function generatePlan() {
  const validationError = validatePlan();
  formError.value = validationError;
  planError.value = '';
  if (validationError || !fields.start.selected || !fields.end.selected) return;

  planController?.abort();
  const controller = new AbortController();
  planController = controller;
  planning.value = true;
  refreshing.value = Boolean(plan.value);
  try {
    const response = await post<PlanResponse>('/api/ride-planner/plan', {
      start: { latitude: fields.start.selected.latitude, longitude: fields.start.selected.longitude },
      end: { latitude: fields.end.selected.latitude, longitude: fields.end.selected.longitude },
      departureTime: toOffsetIso(departureLocal.value),
      rideType: rideType.value
    }, { signal: controller.signal });
    if (!controller.signal.aborted) plan.value = response.data;
  } catch (error) {
    if (!controller.signal.aborted) planError.value = userFacingPlanError(error instanceof Error ? error.message : '');
  } finally {
    if (!controller.signal.aborted) {
      planning.value = false;
      refreshing.value = false;
    }
  }
}

function formatDuration(minutes: number) {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  return hours ? `${hours}h ${whole % 60}m` : `${whole} min`;
}

function formatForecastTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function metricNumber(value: number | null, suffix: string) {
  return value === null ? 'Unknown' : `${value}${suffix}`;
}

onMounted(() => document.addEventListener('click', closePlaceLists));
onBeforeUnmount(() => {
  document.removeEventListener('click', closePlaceLists);
  fieldKeys.forEach((key) => { searchSequences[key] += 1; clearSearch(key); });
  planController?.abort();
});
</script>

<template>
  <section class="ride-planner-page">
    <div class="planner-intro"><div><p class="eyebrow">Route intelligence</p><h2>Build a ride around the conditions.</h2><p>Choose two verified places, a departure time, and a training objective.</p></div><span class="planner-status">Server-backed forecast</span></div>
    <div class="planner-grid">
      <form class="planner-form panel" @submit.prevent="generatePlan">
        <div class="planner-form-heading"><p class="eyebrow">Plan input</p><h2>Ride brief</h2></div>
        <section v-for="key in fieldKeys" :key="key" class="place-search">
          <label :for="`${key}-place`">{{ key === 'start' ? '起点' : '终点' }}</label>
          <div class="place-input-wrap"><input :id="`${key}-place`" v-model="fields[key].text" type="search" autocomplete="off" :aria-expanded="fields[key].open" :aria-controls="`${key}-places`" :aria-activedescendant="fields[key].open && fields[key].places[fields[key].activeIndex] ? `${key}-option-${fields[key].activeIndex}` : undefined" role="combobox" :placeholder="key === 'start' ? '搜索起点，例如西南大学' : '搜索终点，例如缙云山'" @input="handlePlaceInput(key)" @keydown="handlePlaceKeydown(key, $event)" @focus="fields[key].places.length && (fields[key].open = true)" /></div>
          <p v-if="fields[key].selected" class="place-selected">已选择：{{ fields[key].selected.label }}</p>
          <div v-if="fields[key].open" :id="`${key}-places`" class="place-results" role="listbox" :aria-label="key === 'start' ? '起点候选' : '终点候选'">
            <p v-if="fields[key].loading" class="place-state">正在搜索地点...</p><p v-else-if="fields[key].error" class="place-state error">{{ fields[key].error }}</p><p v-else-if="fields[key].empty" class="place-state">未找到匹配地点，请换一个更完整的名称。</p>
            <button v-for="(place, index) in fields[key].places" v-else :id="`${key}-option-${index}`" :key="place.id" type="button" role="option" :aria-selected="index === fields[key].activeIndex" :class="{ active: index === fields[key].activeIndex }" @mousedown.prevent="selectPlace(key, place)"><strong>{{ place.name || place.label }}</strong><span>{{ [place.locality, place.region, place.country].filter(Boolean).join(' · ') || place.label }}</span></button>
          </div>
        </section>
        <label>出发时间<input v-model="departureLocal" type="datetime-local" :min="minDeparture" :max="maxDeparture" required /></label>
        <fieldset class="ride-type-picker"><legend>骑行目标</legend><label v-for="option in rideTypeOptions" :key="option.value" :class="{ active: rideType === option.value }"><input v-model="rideType" type="radio" :value="option.value" /><span><b>{{ option.label }}</b><small>{{ option.detail }}</small></span></label></fieldset>
        <p v-if="formError" class="error planner-error">{{ formError }}</p><p v-if="planError" class="error planner-error">{{ planError }}</p>
        <button class="primary planner-submit" type="submit" :disabled="!canGenerate">{{ planning ? 'Generating plan...' : 'Generate Ride Plan' }}</button>
      </form>
      <section class="planner-result panel" :aria-busy="planning">
        <div v-if="!plan" class="planner-empty"><p class="eyebrow">Plan output</p><h2>Awaiting a ride brief.</h2><p>选择已验证的起点、终点、出发时间和目标后生成真实路线与天气评估。</p></div>
        <template v-else>
          <div class="planner-result-heading"><div><p class="eyebrow">Generated plan</p><h2>{{ fields.start.selected?.name || '起点' }} to {{ fields.end.selected?.name || '终点' }}</h2></div><span v-if="refreshing" class="planner-status">Refreshing</span></div>
          <section class="plan-section"><div class="plan-section-heading"><p>Route summary</p><span>{{ plan.route.profile }}</span></div><div class="route-metrics"><div><span>Distance</span><strong>{{ plan.route.distanceKm.toFixed(2) }} km</strong></div><div><span>Duration</span><strong>{{ formatDuration(plan.route.durationMinutes) }}</strong></div><div><span>Climb</span><strong>{{ metricNumber(plan.route.elevationGainM, ' m') }}</strong></div><div><span>Descent</span><strong>{{ metricNumber(plan.route.elevationLossM, ' m') }}</strong></div></div></section>
          <section class="plan-section weather-section"><div class="plan-section-heading"><p>Departure weather</p><span>起点天气</span></div><p class="forecast-time">{{ formatForecastTime(plan.weather.forecastTime) }}</p><div class="weather-metrics"><span><b>{{ plan.weather.temperatureC }}°C</b>气温</span><span><b>{{ plan.weather.apparentTemperatureC }}°C</b>体感</span><span><b>{{ plan.weather.rainProbability }}%</b>降雨</span><span><b>{{ plan.weather.precipitationMm }} mm</b>降水</span><span><b>{{ plan.weather.windSpeedKph }} kph</b>风速</span><span><b>{{ plan.weather.windGustKph }} kph</b>阵风</span></div></section>
          <section class="plan-section recommendation-section"><div class="recommendation-heading"><div><p>Recommendation</p><strong>{{ plan.recommendation.score }}</strong><span>/ 100</span></div><b :class="`recommendation-level level-${plan.recommendation.level}`">{{ levelLabels[plan.recommendation.level] }}</b></div><div v-if="plan.recommendation.reasons.length" class="recommendation-copy"><h3>适合条件</h3><p v-for="reason in plan.recommendation.reasons" :key="reason">{{ reason }}</p></div><div v-if="plan.recommendation.warnings.length" class="recommendation-copy warnings"><h3>注意事项</h3><p v-for="warning in plan.recommendation.warnings" :key="warning">{{ warning }}</p></div><div class="factor-list"><div v-for="factor in plan.recommendation.factors" :key="factor.code" :class="factor.impact >= 0 ? 'positive' : 'negative'"><span>{{ factor.message }}</span><b>{{ factor.impact > 0 ? '+' : '' }}{{ factor.impact }}</b></div></div><p class="recommendation-disclaimer">建议基于路线、天气和骑行目标的规则评估，不构成安全保证。</p></section>
        </template>
      </section>
    </div>
  </section>
</template>
