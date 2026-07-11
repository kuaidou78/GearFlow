<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { get, post, put, remove } from './api';
import RidePlannerPage from './components/RidePlannerPage.vue';
import WavyCubesBackground from './components/WavyCubesBackground.vue';

const dashboardHeroUrl = new URL('./assets/raw/my-merida-dashboard-original.jpeg', import.meta.url).href;
const sculturaGarageUrl = new URL('./assets/raw/scultura-garage-original.jpg', import.meta.url).href;
const reactoRidesUrl = new URL('./assets/raw/reacto-rides-original.jpg', import.meta.url).href;
const gearHeroUrl = new URL('./assets/raw/gear-dura-ace-brake-original.jpg', import.meta.url).href;

type View = 'dashboard' | 'rides' | 'ride-planner' | 'bikes' | 'gears' | 'maintenance' | 'insights';
type ViewDirection = 'initial' | 'forward' | 'backward';

type User = { id: string; name: string; email: string; role: string };
type Bike = { id: string; name: string; brand: string; model?: string; bikeType: string; purchaseDate?: string; notes?: string; _count?: { rides: number; gears: number } };
type Ride = { id: string; title: string; rideDate: string; distanceKm: number; durationMin: number; elevationM: number; route?: string; notes?: string; bikeId?: string; bike?: Pick<Bike, 'id' | 'name'> };
type Gear = { id: string; name: string; category: string; brand: string; model?: string; purchasePrice: number; purchaseDate: string; expectedLifespanMonths: number; condition: string; minResidualRate: number; notes?: string; bikeId?: string; bike?: Pick<Bike, 'id' | 'name'>; valuation?: { currentValue: number; depreciationAmount: number; depreciationRate?: number; currentRate?: number } };
type ValuationInput = { purchasePrice: number; purchaseDate: string; condition: string; expectedLifespanMonths: number; minResidualRate: number };
type ValuationPreview = { method: string; estimatedValue: number; rangeLow: number | null; rangeHigh: number | null; ruleEstimate: number; marketEstimate: number | null; comparableCount: number; marketProvider: string | null; confidence: string; retainedRate: number; valueLoss: number; usedMonths: number; factors: { key: string; label: string; value: string | number }[]; warnings: string[] };
type Maintenance = { id: string; gearId: string; type: string; title: string; maintenanceDate: string; cost: number; nextDueDate?: string; notes?: string; gear?: Pick<Gear, 'id' | 'name' | 'category' | 'brand'> };
type PageCopy = { title: string; description: string; action: string };

const views: { key: View; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'rides', label: 'Rides' },
  { key: 'ride-planner', label: 'Ride Planner' },
  { key: 'bikes', label: 'Bikes' },
  { key: 'gears', label: 'Gear' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'insights', label: 'Insights' }
];

const pageCopy: Record<View, PageCopy> = {
  dashboard: {
    title: 'Garage overview',
    description: 'A private view of the current bike, recent rides, garage value, and service queue.',
    action: 'Log a ride'
  },
  rides: {
    title: 'Ride performance',
    description: 'A focused record of distance, duration, route context, and the machine behind each session.',
    action: 'New ride'
  },
  'ride-planner': {
    title: 'Ride planner',
    description: 'Build a weather-aware route brief from verified places and a real road-cycling route.',
    action: 'Generate plan'
  },
  bikes: {
    title: 'My Garage',
    description: 'Manage each bike as a riding machine with linked rides, equipment, and service context.',
    action: 'New bike'
  },
  gears: {
    title: 'Equipment system',
    description: 'Track component value, condition, and bike assignment across the garage.',
    action: 'New gear'
  },
  maintenance: {
    title: 'Service board',
    description: 'Keep maintenance history visible and catch upcoming work before it slips.',
    action: 'New service'
  },
  insights: {
    title: 'Insights',
    description: 'Read the current training and garage signals without opening raw tables.',
    action: 'Refresh'
  }
};

const gearCategories = ['bike', 'wheelset', 'computer', 'helmet', 'shoes', 'clothing', 'tool', 'drivetrain', 'other'];
const gearConditionOptions = [
  { value: 'new', label: '全新' },
  { value: 'excellent', label: '极佳' },
  { value: 'good', label: '良好' },
  { value: 'fair', label: '一般' },
  { value: 'poor', label: '较差' }
];
const maintenanceTypes = ['cleaning', 'tires', 'chain', 'brakes', 'drivetrain', 'full_service', 'other'];

const currentView = ref<View>('dashboard');
const user = ref<User | null>(null);
const authMode = ref<'login' | 'register'>('login');
const loading = ref(false);
const error = ref('');
const notice = ref('');
const bikeSearch = ref('');
const rideSearch = ref('');
const gearSearch = ref('');
const maintenanceSearch = ref('');
const gearCategoryFilter = ref('');
const bikeFormOpen = ref(false);
const rideFormOpen = ref(false);
const gearFormOpen = ref(false);
const estimatorGearId = ref<string | null>(null);
const estimatorSaved = ref<ValuationInput | null>(null);
const estimatorDraft = reactive<ValuationInput>({ purchasePrice: 0, purchaseDate: '', condition: 'good', expectedLifespanMonths: 48, minResidualRate: 0.2 });
const estimatorResult = ref<ValuationPreview | null>(null);
const estimatorLoading = ref(false);
const estimatorError = ref('');
const estimatorStale = ref(false);
let estimatorRequestId = 0;
const transitionDirection = ref<ViewDirection>('initial');
const isViewTransitioning = ref(false);
const navRef = ref<HTMLElement | null>(null);
const navIndicator = reactive({ top: '0px', left: '0px', width: '3px', height: '44px' });
const fontStatus = ref<'checking' | 'instrument' | 'fallback'>('checking');

const authForm = reactive({ name: '', email: 'demo@gearflow.app', password: 'ride123' });
const bikeForm = reactive({ id: '', name: '', brand: '', model: '', bikeType: 'road', purchaseDate: '', notes: '' });
const rideForm = reactive({ id: '', bikeId: '', title: '', rideDate: today(), distanceKm: 0, durationMin: 60, elevationM: 0, route: '', notes: '' });
const gearForm = reactive({ id: '', bikeId: '', name: '', category: 'wheelset', brand: '', model: '', purchasePrice: 0, purchaseDate: today(), expectedLifespanMonths: 48, condition: 'good', minResidualRate: 0.2, notes: '' });
const maintenanceForm = reactive({ id: '', gearId: '', type: 'cleaning', title: '', maintenanceDate: today(), cost: 0, nextDueDate: '', notes: '' });

const bikes = ref<Bike[]>([]);
const rides = ref<Ride[]>([]);
const gears = ref<Gear[]>([]);
const maintenance = ref<Maintenance[]>([]);
const dashboard = ref<any>(null);
const insights = ref<any>(null);
const animatedViews = ref<View[]>([]);

const activePage = computed(() => pageCopy[currentView.value]);
const activeViewIndex = computed(() => views.findIndex((view) => view.key === currentView.value));
const transitionShellClass = computed(() => ({
  'view-forward': transitionDirection.value === 'forward',
  'view-backward': transitionDirection.value === 'backward'
}));
const transitionName = computed(() => `page-${transitionDirection.value}`);
const totalDistance = computed(() => rides.value.reduce((sum, ride) => sum + Number(ride.distanceKm || 0), 0));
const totalDuration = computed(() => rides.value.reduce((sum, ride) => sum + Number(ride.durationMin || 0), 0));
const totalElevation = computed(() => rides.value.reduce((sum, ride) => sum + Number(ride.elevationM || 0), 0));
const totalGearValue = computed(() => gears.value.reduce((sum, gear) => sum + Number(gear.valuation?.currentValue || gear.purchasePrice || 0), 0));
const maintenanceSpend = computed(() => maintenance.value.reduce((sum, item) => sum + Number(item.cost || 0), 0));
const dueSoonMaintenance = computed(() => maintenance.value.filter((item) => item.nextDueDate && daysUntil(item.nextDueDate) <= 45));
const overdueMaintenance = computed(() => dueSoonMaintenance.value.filter((item) => item.nextDueDate && daysUntil(item.nextDueDate) < 0));
const latestRide = computed(() => rides.value[0]);
const latestGear = computed(() => gears.value[0]);
const latestMaintenance = computed(() => maintenance.value[0]);
const highRiskGear = computed(() => gears.value.filter((gear) => Number(gear.valuation?.depreciationAmount || 0) > Number(gear.purchasePrice || 0) * 0.45));
const totalGearPurchaseValue = computed(() => gears.value.reduce((sum, gear) => sum + Number(gear.purchasePrice || 0), 0));
const gearValueDifference = computed(() => totalGearValue.value - totalGearPurchaseValue.value);
const mostUsedBike = computed(() => {
  const usage = new Map<string, number>();
  rides.value.forEach((ride) => {
    const name = ride.bike?.name || 'Unassigned';
    usage.set(name, (usage.get(name) || 0) + 1);
  });
  const [name, count] = [...usage.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, count } : null;
});

const dashboardMetrics = computed(() => [
  { label: 'Total distance', value: distance(dashboard.value?.kpis?.rideDistanceTotal || totalDistance.value), detail: `${rides.value.length} rides logged`, tone: 'primary' },
  { label: 'Ride time', value: minutes(totalDuration.value), detail: `${totalElevation.value} m elevation`, tone: 'neutral' },
  { label: 'Bikes', value: String(dashboard.value?.kpis?.bikeCount || bikes.value.length), detail: 'active in garage', tone: 'neutral' },
  { label: 'Gear value', value: money(dashboard.value?.kpis?.currentValueTotal || totalGearValue.value), detail: `${gears.value.length} tracked items`, tone: 'neutral' },
  { label: 'Service watch', value: String(dueSoonMaintenance.value.length), detail: overdueMaintenance.value.length ? `${overdueMaintenance.value.length} overdue` : 'next 45 days', tone: overdueMaintenance.value.length ? 'warning' : 'success' }
]);

const nextServiceSummary = computed(() => {
  const service = overdueMaintenance.value[0] || dueSoonMaintenance.value[0] || latestMaintenance.value;
  if (!service) {
    return {
      label: 'Next Service',
      value: 'No service scheduled',
      detail: maintenance.value.length ? 'Review service history when needed.' : 'Add a service record when work is planned.',
      tone: 'neutral',
      icon: 'service'
    };
  }

  return {
    label: 'Next Service',
    value: service.title,
    detail: service.nextDueDate ? relativeDue(service.nextDueDate) : `${toDateInput(service.maintenanceDate)} logged`,
    tone: serviceTone(service),
    icon: 'service'
  };
});

const latestRideSummary = computed(() => {
  const ride = latestRide.value;
  if (!ride) {
    return {
      label: 'Latest Ride',
      value: 'No rides yet',
      detail: 'Log a ride to start the activity timeline.',
      tone: 'neutral',
      icon: 'ride'
    };
  }

  return {
    label: 'Latest Ride',
    value: ride.title,
    detail: `${toDateInput(ride.rideDate)} | ${distance(ride.distanceKm)}`,
    tone: 'primary',
    icon: 'ride'
  };
});

const garageValueSummary = computed(() => ({
  label: 'Garage Value',
  value: money(dashboard.value?.kpis?.currentValueTotal || totalGearValue.value),
  detail: `${gears.value.length} tracked gear items`,
  tone: highRiskGear.value.length ? 'warning' : 'neutral',
  icon: 'value'
}));

const dashboardSummaries = computed(() => [
  nextServiceSummary.value,
  latestRideSummary.value,
  garageValueSummary.value
]);

const nextActions = computed(() => {
  const actions = [];
  if (overdueMaintenance.value[0]) {
    actions.push({
      title: 'Handle overdue service',
      detail: `${overdueMaintenance.value[0].title} is past its due date.`,
      action: 'Open maintenance',
      view: 'maintenance' as View,
      tone: 'warning'
    });
  } else if (dueSoonMaintenance.value[0]) {
    actions.push({
      title: 'Plan upcoming service',
      detail: `${dueSoonMaintenance.value[0].title} is due ${relativeDue(dueSoonMaintenance.value[0].nextDueDate)}.`,
      action: 'Review service',
      view: 'maintenance' as View,
      tone: 'primary'
    });
  }
  if (latestRide.value) {
    actions.push({
      title: 'Review latest ride',
      detail: `${latestRide.value.title} added ${distance(latestRide.value.distanceKm)} to the log.`,
      action: 'Open rides',
      view: 'rides' as View,
      tone: 'neutral'
    });
  }
  actions.push({
    title: 'Keep the garage current',
    detail: highRiskGear.value.length ? `${highRiskGear.value.length} gear items have heavy depreciation.` : 'Add missing gear and service dates for sharper planning.',
    action: 'Open gear',
    view: 'gears' as View,
    tone: highRiskGear.value.length ? 'warning' : 'success'
  });
  return actions.slice(0, 3);
});

const recentActivity = computed(() => [
  latestRide.value ? { type: 'Ride', title: latestRide.value.title, detail: `${toDateInput(latestRide.value.rideDate)} | ${distance(latestRide.value.distanceKm)}`, view: 'rides' as View } : null,
  latestMaintenance.value ? { type: 'Service', title: latestMaintenance.value.title, detail: `${latestMaintenance.value.gear?.name || 'Gear'} | ${money(latestMaintenance.value.cost)}`, view: 'maintenance' as View } : null,
  latestGear.value ? { type: 'Gear', title: latestGear.value.name, detail: `${latestGear.value.category} | ${money(latestGear.value.valuation?.currentValue || latestGear.value.purchasePrice)}`, view: 'gears' as View } : null
].filter(Boolean) as { type: string; title: string; detail: string; view: View }[]);

const bikeStats = computed(() => [
  { label: 'Active bikes', value: String(bikes.value.length) },
  { label: 'Ride linked', value: String(bikes.value.filter((bike) => Number(bike._count?.rides || 0) > 0).length) },
  { label: 'Gear linked', value: String(bikes.value.reduce((sum, bike) => sum + Number(bike._count?.gears || 0), 0)) }
]);

const rideReadouts = computed(() => [
  { label: 'Total distance', value: distance(totalDistance.value), detail: `${rides.value.length} sessions logged` },
  { label: 'Ride count', value: String(rides.value.length), detail: rides.value.length === 1 ? 'one session on record' : 'sessions on record' },
  { label: 'Total duration', value: minutes(totalDuration.value), detail: totalElevation.value ? `${totalElevation.value} m elevation logged` : 'duration tracked across all sessions' },
  { label: 'Most used bike', value: mostUsedBike.value?.name || 'No linked bike', detail: mostUsedBike.value ? `${mostUsedBike.value.count} logged ${mostUsedBike.value.count === 1 ? 'ride' : 'rides'}` : 'link a ride to a bike to track use' }
]);

const gearReadouts = computed(() => [
  { label: 'Gear count', value: String(gears.value.length), detail: `${new Set(gears.value.map((gear) => gear.category)).size} categories tracked` },
  { label: 'Purchase value', value: money(totalGearPurchaseValue.value), detail: 'recorded acquisition cost' },
  { label: 'Current value', value: money(totalGearValue.value), detail: 'existing record valuation' },
  { label: 'Value difference', value: signedMoney(gearValueDifference.value), detail: highRiskGear.value.length ? `${highRiskGear.value.length} items on the value watch` : 'purchase value versus current value', tone: gearValueDifference.value < 0 ? 'warning' : 'neutral' }
]);

const maintenanceStats = computed(() => [
  { label: 'Services', value: String(maintenance.value.length) },
  { label: 'Spend', value: money(maintenanceSpend.value) },
  { label: 'Due soon', value: String(dueSoonMaintenance.value.length) },
  { label: 'Overdue', value: String(overdueMaintenance.value.length) }
]);

const insightStats = computed(() => [
  { label: 'Monthly points', value: String(insights.value?.monthlyRideDistance?.length || 0) },
  { label: 'Bike split', value: String(insights.value?.rideDistanceByBike?.length || 0) },
  { label: 'Asset groups', value: String(insights.value?.categoryAssetShare?.length || 0) },
  { label: 'Rules active', value: String(insights.value?.advice?.length || 0) }
]);

const filteredBikes = computed(() => {
  const query = bikeSearch.value.trim().toLowerCase();
  if (!query) return bikes.value;
  return bikes.value.filter((bike) => [bike.name, bike.brand, bike.model, bike.bikeType].some((value) => String(value || '').toLowerCase().includes(query)));
});

const filteredRides = computed(() => {
  const query = rideSearch.value.trim().toLowerCase();
  if (!query) return rides.value;
  return rides.value.filter((ride) => [ride.title, ride.route, ride.bike?.name].some((value) => String(value || '').toLowerCase().includes(query)));
});

const filteredGears = computed(() => {
  const query = gearSearch.value.trim().toLowerCase();
  return gears.value.filter((gear) => {
    const matchesSearch = !query || [gear.name, gear.brand, gear.model, gear.category, gear.bike?.name].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesCategory = !gearCategoryFilter.value || gear.category === gearCategoryFilter.value;
    return matchesSearch && matchesCategory;
  });
});

const filteredMaintenance = computed(() => {
  const query = maintenanceSearch.value.trim().toLowerCase();
  if (!query) return maintenance.value;
  return maintenance.value.filter((item) => [item.title, item.type, item.gear?.name, item.notes].some((value) => String(value || '').toLowerCase().includes(query)));
});

const maxMonthlyDistance = computed(() => Math.max(1, ...((insights.value?.monthlyRideDistance || []).map((row: any) => Number(row.distanceKm || 0)))));
const maxBikeDistance = computed(() => Math.max(1, ...((insights.value?.rideDistanceByBike || []).map((row: any) => Number(row.distanceKm || 0)))));
const maxAssetShare = computed(() => Math.max(1, ...((insights.value?.categoryAssetShare || []).map((row: any) => Number(row.value || 0)))));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function residualRatePercent(value: number) {
  const rate = Number(value);
  return Number.isFinite(rate) ? Math.round(Math.min(1, Math.max(0, rate)) * 100) : 0;
}

function setResidualRate(target: { minResidualRate: number }, rawValue: string | number) {
  const percent = Number(rawValue);
  target.minResidualRate = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) / 100 : 0;
}

function updateEstimatorResidualRate(event: Event) {
  setResidualRate(estimatorDraft, (event.target as HTMLInputElement).value);
  markEstimatorStale();
}

function updateGearFormResidualRate(event: Event) {
  setResidualRate(gearForm, (event.target as HTMLInputElement).value);
}

function money(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function distance(value: number) {
  return `${Number(value || 0).toFixed(1)} km`;
}

function minutes(value: number) {
  const total = Number(value || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function signedMoney(value: number) {
  const formatted = money(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function daysUntil(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const start = new Date(today()).getTime();
  const target = new Date(value).getTime();
  return Math.ceil((target - start) / 86400000);
}

function relativeDue(value?: string) {
  const days = daysUntil(value);
  if (!Number.isFinite(days)) return 'not scheduled';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'today';
  return `in ${days} days`;
}

function barWidth(value: number, max: number) {
  if (!value || !max) return '6%';
  return `${Math.max(6, Math.min(100, (Number(value) / max) * 100))}%`;
}

function conditionTone(condition: string) {
  if (['new', 'excellent'].includes(condition)) return 'success';
  if (condition === 'good') return 'primary';
  if (condition === 'fair') return 'warning';
  return 'danger';
}

function conditionLabel(condition: string) {
  return gearConditionOptions.find((option) => option.value === condition)?.label || condition;
}

function estimatorFactorValue(factor: ValuationPreview['factors'][number]) {
  if (factor.key === 'condition') return conditionLabel(String(factor.value));
  if (factor.key === 'residual_rate') return `${residualRatePercent(Number(factor.value))}%`;
  return factor.value;
}

function bikeThumbnailClass(bike: Bike) {
  const type = String(bike.bikeType || '').toLowerCase();
  if (type.includes('gravel')) return 'thumbnail-gravel';
  if (type.includes('mountain') || type.includes('mtb')) return 'thumbnail-mountain';
  if (type.includes('commuter') || type.includes('city')) return 'thumbnail-commuter';
  return 'thumbnail-road';
}

function bikeInitials(bike: Bike) {
  const source = `${bike.brand || ''} ${bike.name || ''}`.trim() || 'Bike';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function serviceTone(item: Maintenance) {
  const days = daysUntil(item.nextDueDate);
  if (days < 0) return 'danger';
  if (days <= 45) return 'warning';
  return 'success';
}

function getViewIndex(view: View) {
  return views.findIndex((item) => item.key === view);
}

async function updateNavIndicator() {
  await nextTick();
  const nav = navRef.value;
  const activeButton = nav?.querySelector<HTMLButtonElement>(`button[data-view="${currentView.value}"]`);
  if (!nav || !activeButton) return;

  const navRect = nav.getBoundingClientRect();
  const buttonRect = activeButton.getBoundingClientRect();
  const isMobileRail = window.matchMedia('(max-width: 860px)').matches;

  if (isMobileRail) {
    navIndicator.top = `${buttonRect.bottom - navRect.top - 8}px`;
    navIndicator.left = `${buttonRect.left - navRect.left + 18}px`;
    navIndicator.width = `${Math.max(24, buttonRect.width - 36)}px`;
    navIndicator.height = '3px';
  } else {
    navIndicator.top = `${buttonRect.top - navRect.top + 10}px`;
    navIndicator.left = '6px';
    navIndicator.width = '3px';
    navIndicator.height = `${Math.max(18, buttonRect.height - 20)}px`;
  }
}

async function switchView(view: View) {
  if (view === currentView.value || isViewTransitioning.value) return;

  const previousIndex = getViewIndex(currentView.value);
  const nextIndex = getViewIndex(view);
  transitionDirection.value = nextIndex > previousIndex ? 'forward' : 'backward';
  isViewTransitioning.value = true;
  await updateNavIndicator();
  currentView.value = view;
}

async function handleViewEnter() {
  if (!animatedViews.value.includes(currentView.value)) {
    animatedViews.value.push(currentView.value);
  }
  isViewTransitioning.value = false;
  await updateNavIndicator();
}

function handlePrimaryAction() {
  if (currentView.value === 'dashboard') switchView('rides');
  else if (currentView.value === 'insights') loadWorkspace();
  else if (currentView.value === 'bikes') {
    resetBikeForm();
    bikeFormOpen.value = true;
  }
  else if (currentView.value === 'rides') {
    resetRideForm();
    rideFormOpen.value = true;
  }
  else if (currentView.value === 'gears') {
    resetGearForm();
    gearFormOpen.value = true;
  }
  else if (currentView.value === 'maintenance') resetMaintenanceForm();
}

function resetBikeForm() {
  Object.assign(bikeForm, { id: '', name: '', brand: '', model: '', bikeType: 'road', purchaseDate: '', notes: '' });
}

function closeBikeForm() {
  resetBikeForm();
  bikeFormOpen.value = false;
}

function resetRideForm() {
  Object.assign(rideForm, { id: '', bikeId: bikes.value[0]?.id || '', title: '', rideDate: today(), distanceKm: 0, durationMin: 60, elevationM: 0, route: '', notes: '' });
}

function closeRideForm() {
  resetRideForm();
  rideFormOpen.value = false;
}

function resetGearForm() {
  Object.assign(gearForm, { id: '', bikeId: '', name: '', category: 'wheelset', brand: '', model: '', purchasePrice: 0, purchaseDate: today(), expectedLifespanMonths: 48, condition: 'good', minResidualRate: 0.2, notes: '' });
}

function estimatorInputFromGear(gear: Gear): ValuationInput {
  return {
    purchasePrice: Number(gear.purchasePrice),
    purchaseDate: toDateInput(gear.purchaseDate),
    condition: gear.condition,
    expectedLifespanMonths: Number(gear.expectedLifespanMonths),
    minResidualRate: Number(gear.minResidualRate)
  };
}

function clearEstimator() {
  estimatorRequestId += 1;
  estimatorGearId.value = null;
  estimatorSaved.value = null;
  estimatorResult.value = null;
  estimatorError.value = '';
  estimatorStale.value = false;
  estimatorLoading.value = false;
}

function markEstimatorStale() {
  if (estimatorGearId.value) estimatorStale.value = true;
}

async function calculateEstimator() {
  const gearId = estimatorGearId.value;
  if (!gearId || estimatorLoading.value) return;

  const requestId = ++estimatorRequestId;
  estimatorLoading.value = true;
  estimatorError.value = '';
  try {
    const response = await post<ValuationPreview>(`/api/gears/${gearId}/valuation/preview`, { ...estimatorDraft });
    if (requestId !== estimatorRequestId || estimatorGearId.value !== gearId) return;
    estimatorResult.value = response.data;
    estimatorStale.value = false;
  } catch (err) {
    if (requestId === estimatorRequestId && estimatorGearId.value === gearId) {
      estimatorError.value = err instanceof Error ? err.message : 'Value preview failed.';
    }
  } finally {
    if (requestId === estimatorRequestId) estimatorLoading.value = false;
  }
}

async function openEstimator(gear: Gear) {
  if (estimatorGearId.value === gear.id) {
    clearEstimator();
    return;
  }
  const saved = estimatorInputFromGear(gear);
  estimatorGearId.value = gear.id;
  estimatorSaved.value = { ...saved };
  Object.assign(estimatorDraft, saved);
  estimatorResult.value = null;
  estimatorError.value = '';
  estimatorStale.value = false;
  await calculateEstimator();
}

async function resetEstimator() {
  if (!estimatorSaved.value) return;
  Object.assign(estimatorDraft, estimatorSaved.value);
  estimatorStale.value = false;
  await calculateEstimator();
}

function closeGearForm() {
  resetGearForm();
  gearFormOpen.value = false;
}

function resetMaintenanceForm() {
  Object.assign(maintenanceForm, { id: '', gearId: gears.value[0]?.id || '', type: 'cleaning', title: '', maintenanceDate: today(), cost: 0, nextDueDate: '', notes: '' });
}

async function authenticate() {
  loading.value = true;
  error.value = '';
  try {
    const path = authMode.value === 'register' ? '/api/auth/register' : '/api/auth/login';
    const body = authMode.value === 'register'
      ? { name: authForm.name, email: authForm.email, password: authForm.password }
      : { email: authForm.email, password: authForm.password };
    const result = await post<{ user: User }>(path, body);
    user.value = result.data.user;
    await loadWorkspace();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed.';
  } finally {
    loading.value = false;
  }
}

async function logout() {
  await post('/api/auth/logout');
  user.value = null;
  dashboard.value = null;
  insights.value = null;
}

async function loadWorkspace() {
  loading.value = true;
  error.value = '';
  try {
    const [bikeResult, rideResult, gearResult, maintenanceResult, dashboardResult, insightsResult] = await Promise.all([
      get<Bike[]>('/api/bikes'),
      get<Ride[]>('/api/rides'),
      get<Gear[]>('/api/gears'),
      get<Maintenance[]>('/api/maintenance'),
      get<any>('/api/dashboard/summary'),
      get<any>('/api/insights/overview')
    ]);
    bikes.value = bikeResult.data;
    rides.value = rideResult.data;
    gears.value = gearResult.data;
    maintenance.value = maintenanceResult.data;
    dashboard.value = dashboardResult.data;
    insights.value = insightsResult.data;
    if (!rideForm.bikeId && bikes.value[0]) rideForm.bikeId = bikes.value[0].id;
    if (!maintenanceForm.gearId && gears.value[0]) maintenanceForm.gearId = gears.value[0].id;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Data failed to load.';
  } finally {
    loading.value = false;
  }
}

async function runAction(workingMessage: string, successMessage: string, action: () => Promise<void>) {
  loading.value = true;
  error.value = '';
  notice.value = workingMessage;
  try {
    await action();
    notice.value = successMessage;
  } catch (err) {
    notice.value = '';
    error.value = err instanceof Error ? err.message : 'Action failed.';
  } finally {
    loading.value = false;
  }
}

function confirmDelete(label: string) {
  return window.confirm(`Delete ${label}? This cannot be undone.`);
}

async function saveBike() {
  await runAction('Saving bike...', bikeForm.id ? 'Bike updated.' : 'Bike added.', async () => {
    const body = { ...bikeForm };
    if (bikeForm.id) await put(`/api/bikes/${bikeForm.id}`, body);
    else await post('/api/bikes', body);
    resetBikeForm();
    bikeFormOpen.value = false;
    await loadWorkspace();
  });
}

function editBike(item: Bike) {
  Object.assign(bikeForm, { ...item, purchaseDate: toDateInput(item.purchaseDate), notes: item.notes || '', model: item.model || '' });
  bikeFormOpen.value = true;
}

async function deleteBike(id: string, name = 'bike') {
  if (!confirmDelete(name)) return;
  await runAction('Deleting bike...', 'Bike deleted.', async () => {
    await remove(`/api/bikes/${id}`);
    await loadWorkspace();
  });
}

async function saveRide() {
  await runAction('Saving ride...', rideForm.id ? 'Ride updated.' : 'Ride added.', async () => {
    const body = { ...rideForm, bikeId: rideForm.bikeId || null };
    if (rideForm.id) await put(`/api/rides/${rideForm.id}`, body);
    else await post('/api/rides', body);
    resetRideForm();
    rideFormOpen.value = false;
    await loadWorkspace();
  });
}

function editRide(item: Ride) {
  Object.assign(rideForm, { ...item, bikeId: item.bikeId || item.bike?.id || '', rideDate: toDateInput(item.rideDate), route: item.route || '', notes: item.notes || '' });
  rideFormOpen.value = true;
}

async function deleteRide(id: string, title = 'ride') {
  if (!confirmDelete(title)) return;
  await runAction('Deleting ride...', 'Ride deleted.', async () => {
    await remove(`/api/rides/${id}`);
    await loadWorkspace();
  });
}

async function saveGear() {
  await runAction('Saving gear...', gearForm.id ? 'Gear updated.' : 'Gear added.', async () => {
    const body = { ...gearForm, bikeId: gearForm.bikeId || null };
    if (gearForm.id) await put(`/api/gears/${gearForm.id}`, body);
    else await post('/api/gears', body);
    resetGearForm();
    gearFormOpen.value = false;
    await loadWorkspace();
  });
}

function editGear(item: Gear) {
  clearEstimator();
  Object.assign(gearForm, { ...item, bikeId: item.bikeId || item.bike?.id || '', purchaseDate: toDateInput(item.purchaseDate), model: item.model || '', notes: item.notes || '' });
  gearFormOpen.value = true;
}

async function deleteGear(id: string, name = 'gear') {
  if (!confirmDelete(name)) return;
  if (estimatorGearId.value === id) clearEstimator();
  await runAction('Deleting gear...', 'Gear deleted.', async () => {
    await remove(`/api/gears/${id}`);
    await loadWorkspace();
  });
}

async function saveMaintenance() {
  await runAction('Saving service...', maintenanceForm.id ? 'Service updated.' : 'Service added.', async () => {
    const body = { ...maintenanceForm, nextDueDate: maintenanceForm.nextDueDate || null };
    if (maintenanceForm.id) await put(`/api/maintenance/${maintenanceForm.id}`, body);
    else await post('/api/maintenance', body);
    resetMaintenanceForm();
    await loadWorkspace();
  });
}

function editMaintenance(item: Maintenance) {
  Object.assign(maintenanceForm, { ...item, maintenanceDate: toDateInput(item.maintenanceDate), nextDueDate: toDateInput(item.nextDueDate), notes: item.notes || '' });
}

async function deleteMaintenance(id: string, title = 'service') {
  if (!confirmDelete(title)) return;
  await runAction('Deleting service...', 'Service deleted.', async () => {
    await remove(`/api/maintenance/${id}`);
    await loadWorkspace();
  });
}

onMounted(async () => {
  await updateNavIndicator();
  window.addEventListener('resize', updateNavIndicator);
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
      fontStatus.value = document.fonts.check('16px "Instrument Sans"') ? 'instrument' : 'fallback';
      document.documentElement.dataset.fontStatus = fontStatus.value;
    } catch {
      fontStatus.value = 'fallback';
      document.documentElement.dataset.fontStatus = 'fallback';
    }
  } else {
    fontStatus.value = 'fallback';
  }
  try {
    const result = await get<{ user: User }>('/api/auth/me');
    user.value = result.data.user;
    await loadWorkspace();
  } catch {
    user.value = null;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateNavIndicator);
});
</script>

<template>
  <WavyCubesBackground />
  <main v-if="!user" class="auth-screen">
    <section class="auth-panel">
      <div class="auth-intro">
        <div class="brand-lockup">
          <span class="chain-mark"></span>
          <p>GearFlow</p>
        </div>
        <h1>Operate the garage behind every ride.</h1>
        <p>Log rides, watch asset value, and keep service work visible before it becomes a problem.</p>
      </div>
      <form class="auth-form" @submit.prevent="authenticate">
        <div class="segmented">
          <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">Login</button>
          <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">Register</button>
        </div>
        <label v-if="authMode === 'register'">
          Name
          <input v-model="authForm.name" required />
        </label>
        <label>
          Email
          <input v-model="authForm.email" type="email" required />
        </label>
        <label>
          Password
          <input v-model="authForm.password" type="password" required minlength="6" />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary" :disabled="loading">{{ loading ? 'Working...' : authMode === 'login' ? 'Login' : 'Create account' }}</button>
      </form>
    </section>
  </main>

  <main v-else class="app-shell" :class="transitionShellClass">
    <aside class="sidebar">
      <div class="brand-lockup">
        <span class="chain-mark"></span>
        <p>GearFlow</p>
      </div>
      <nav
        ref="navRef"
        class="primary-nav"
        :style="{ '--nav-indicator-top': navIndicator.top, '--nav-indicator-left': navIndicator.left, '--nav-indicator-width': navIndicator.width, '--nav-indicator-height': navIndicator.height }"
      >
        <span class="nav-active-indicator" aria-hidden="true"></span>
        <button v-for="(view, index) in views" :key="view.key" :data-view="view.key" :class="{ active: currentView === view.key }" :aria-current="currentView === view.key ? 'page' : undefined" :style="{ '--nav-index': index, '--active-index': activeViewIndex }" @click="switchView(view.key)">
          {{ view.label }}
        </button>
      </nav>
      <div class="user-card">
        <span>Signed in</span>
        <strong>{{ user.name }}</strong>
        <small>{{ user.email }}</small>
        <button type="button" @click="logout">Logout</button>
      </div>
    </aside>

    <section class="workspace">
      <Transition :name="transitionName" mode="out-in" appear @after-enter="handleViewEnter">
        <div :key="currentView" class="page-content" :class="[`page-view-${currentView}`, { 'page-view-fresh': !animatedViews.includes(currentView) }]">
          <header class="page-header">
            <div>
              <p class="eyebrow">Cycling operations</p>
              <h1>{{ activePage.title }}</h1>
              <p>{{ activePage.description }}</p>
            </div>
            <div class="header-actions">
              <button type="button" class="ghost" @click="loadWorkspace">Refresh</button>
              <button v-if="currentView !== 'ride-planner'" type="button" class="primary" @click="handlePrimaryAction">{{ activePage.action }}</button>
            </div>
          </header>

          <div class="status-stack">
            <p v-if="error" class="error wide">{{ error }}</p>
            <p v-if="notice" class="notice action-notice">{{ notice }}</p>
            <p v-if="loading" class="loading">Syncing workspace...</p>
          </div>

          <section v-if="currentView === 'dashboard'" class="dashboard-layout">
            <article class="hero-panel dashboard-hero-panel glass-surface glass-surface--elevated">
              <img :src="dashboardHeroUrl" alt="User's Merida road bike overlooking the city and hills" class="hero-image" />
              <div class="image-overlay dashboard-overlay"></div>
              <div class="hero-content">
                <p class="eyebrow">Primary machine</p>
                <h2>GearFlow</h2>
                <strong>Cycling Gear Command Center</strong>
                <p>Your Merida is the live machine in focus. The garage is tracking {{ rides.length }} rides, {{ gears.length }} gear items, and {{ maintenance.length }} service records.</p>
                <div class="machine-status">
                  <span>Current Bike</span>
                  <b>Merida road build</b>
                </div>
              </div>
              <div class="quick-actions">
                <button type="button" class="primary" @click="switchView('rides')">Log ride</button>
                <button type="button" class="ghost" @click="switchView('maintenance')">Review service</button>
                <button type="button" class="ghost" @click="switchView('gears')">Check gear</button>
              </div>
            </article>

            <div class="section-label-row">
              <div>
                <p class="eyebrow">Garage instruments</p>
                <h2>Readout band</h2>
              </div>
              <span>{{ today() }}</span>
            </div>

            <section class="panel readout-band cockpit-readouts glass-surface glass-surface--dense">
              <article v-for="metric in dashboardMetrics" :key="metric.label" class="readout-item" :class="`metric-${metric.tone}`">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
                <small>{{ metric.detail }}</small>
              </article>
            </section>

            <section class="dashboard-summary-strip" aria-label="Garage summary">
              <article v-for="item in dashboardSummaries" :key="item.label" class="summary-card glass-surface glass-surface--base" :class="[`summary-${item.icon}`, `summary-${item.tone}`]">
                <div class="summary-copy">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.detail }}</small>
                </div>
                <span class="summary-icon" aria-hidden="true"></span>
              </article>
            </section>

            <section class="dashboard-columns">
              <article class="panel glass-surface glass-surface--base">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">Garage queue</p>
                    <h2>What needs attention</h2>
                  </div>
                </div>
                <div v-if="nextActions.length" class="action-list">
                  <button v-for="item in nextActions" :key="item.title" type="button" class="action-card" :class="`action-${item.tone}`" @click="switchView(item.view)">
                    <span>{{ item.title }}</span>
                    <strong>{{ item.detail }}</strong>
                    <small>{{ item.action }}</small>
                  </button>
                </div>
                <div v-else class="empty-state">
                  <strong>No urgent actions.</strong>
                  <span>Keep logging rides and service dates to improve recommendations.</span>
                </div>
              </article>

              <article class="panel glass-surface glass-surface--base">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">Garage log</p>
                    <h2>Latest movement</h2>
                  </div>
                </div>
                <div v-if="recentActivity.length" class="activity-list">
                  <button v-for="item in recentActivity" :key="`${item.type}-${item.title}`" type="button" class="activity-row" @click="switchView(item.view)">
                    <span class="badge">{{ item.type }}</span>
                    <div>
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.detail }}</small>
                    </div>
                  </button>
                </div>
                <div v-else class="empty-state">
                  <strong>No activity yet.</strong>
                  <span>Add a ride, gear item, or service record to start the timeline.</span>
                </div>
              </article>
            </section>
          </section>

          <RidePlannerPage v-if="currentView === 'ride-planner'" />

          <section v-if="currentView === 'bikes'" class="entity-page">
            <article class="garage-hero-panel">
              <img :src="sculturaGarageUrl" alt="Merida Scultura Team Bahrain Victorious in a dark garage studio" class="garage-image" />
              <div class="image-overlay garage-overlay"></div>
              <div class="garage-hero-copy">
                <p class="eyebrow">Private performance workshop</p>
                <h2>MY GARAGE</h2>
                <p>Scultura studio reference for the workshop mood, separate from the current real bike.</p>
              </div>
              <div class="garage-hero-readouts">
                <span>{{ bikes.length }} machines</span>
                <span>{{ rides.length }} rides logged</span>
                <span>{{ gears.length }} gear links</span>
              </div>
            </article>

            <section class="stat-strip">
              <article v-for="stat in bikeStats" :key="stat.label"><span>{{ stat.label }}</span><strong>{{ stat.value }}</strong></article>
            </section>
            <section class="entity-grid bikes-garage-grid" :class="{ 'form-open': bikeFormOpen || Boolean(bikeForm.id) }">
              <form v-if="bikeFormOpen || bikeForm.id" class="panel form-panel bike-form-panel" @submit.prevent="saveBike">
                <div class="form-panel-heading">
                  <div>
                    <p class="eyebrow">{{ bikeForm.id ? 'Vehicle edit' : 'New vehicle' }}</p>
                    <h2>{{ bikeForm.id ? 'Edit bike' : 'Add bike' }}</h2>
                  </div>
                  <button type="button" class="ghost compact" @click="closeBikeForm">Close</button>
                </div>
                <label>Name<input v-model="bikeForm.name" required /></label>
                <label>Brand<input v-model="bikeForm.brand" required /></label>
                <label>Model<input v-model="bikeForm.model" /></label>
                <label>Type<input v-model="bikeForm.bikeType" required /></label>
                <label>Purchase date<input v-model="bikeForm.purchaseDate" type="date" /></label>
                <label>Notes<textarea v-model="bikeForm.notes"></textarea></label>
                <div class="actions">
                  <button class="primary">{{ bikeForm.id ? 'Update bike' : 'Save bike' }}</button>
                  <button type="button" class="ghost" @click="resetBikeForm">Clear</button>
                </div>
              </form>
              <article class="panel list-panel garage-records">
            <div class="panel-heading">
              <div><p class="eyebrow">Vehicle records</p><h2>Garage records</h2><p>{{ filteredBikes.length }} active bikes</p></div>
              <div class="toolbar">
                <input v-model="bikeSearch" class="search-input" placeholder="Search bikes" />
                <button v-if="!bikeFormOpen && !bikeForm.id" type="button" class="ghost" @click="bikeFormOpen = true">Add bike</button>
              </div>
            </div>
                <div v-if="filteredBikes.length" class="record-list">
                  <div v-for="bike in filteredBikes" :key="bike.id" class="record-card">
                    <div class="bike-thumbnail" :class="bikeThumbnailClass(bike)" aria-hidden="true">
                      <div class="bike-thumbnail-frame">
                        <span class="bike-thumbnail-line"></span>
                        <span class="bike-thumbnail-wheel wheel-front"></span>
                        <span class="bike-thumbnail-wheel wheel-rear"></span>
                        <b>{{ bikeInitials(bike) }}</b>
                      </div>
                    </div>
                    <div class="record-main">
                      <strong>{{ bike.name }}</strong>
                      <span>{{ bike.brand }} {{ bike.model || '' }}</span>
                      <div class="record-meta">
                        <span class="tag">{{ bike.bikeType }}</span>
                        <span>{{ bike._count?.rides || 0 }} rides</span>
                        <span>{{ bike._count?.gears || 0 }} gear</span>
                      </div>
                    </div>
                    <div class="record-actions">
                      <button type="button" @click="editBike(bike)">Edit</button>
                      <button type="button" class="danger" @click="deleteBike(bike.id, bike.name)">Delete</button>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <strong>No bikes found.</strong>
                  <span>Add a bike or adjust your search.</span>
                </div>
              </article>
            </section>
          </section>

          <section v-if="currentView === 'rides'" class="entity-page performance-page">
            <article class="rides-hero-panel">
              <img :src="reactoRidesUrl" alt="Merida Reacto road bike in a night performance setting" class="rides-hero-image" />
              <div class="image-overlay rides-overlay"></div>
              <div class="rides-hero-copy"><p class="eyebrow">Ride performance</p><h2>Night velocity.</h2><p>Every session logged, every kilometre accounted for, with the machine and route context kept close.</p></div>
            </article>
            <section class="performance-readout-band" aria-label="Ride performance readouts"><article v-for="readout in rideReadouts" :key="readout.label" class="performance-readout"><span>{{ readout.label }}</span><strong>{{ readout.value }}</strong><small>{{ readout.detail }}</small></article></section>
            <section class="records-workspace" :class="{ 'form-open': rideFormOpen }">
              <article class="panel list-panel performance-records">
                <div class="panel-heading performance-heading"><div><p class="eyebrow">Performance log</p><h2>Ride records</h2><p>{{ filteredRides.length }} sessions shown</p></div><div class="toolbar"><input v-model="rideSearch" class="search-input" placeholder="Search rides" /><button v-if="!rideFormOpen" type="button" class="ghost compact" @click="resetRideForm(); rideFormOpen = true">Add ride</button></div></div>
                <div v-if="filteredRides.length" class="record-list"><div v-for="ride in filteredRides" :key="ride.id" class="record-card ride-record"><div class="ride-date"><b>{{ toDateInput(ride.rideDate).slice(8) }}</b><span>{{ toDateInput(ride.rideDate).slice(0, 7) }}</span></div><div class="record-main"><strong>{{ ride.title }}</strong><span>{{ ride.route || 'No route notes' }}</span><div class="record-meta"><span>{{ ride.bike?.name || 'No bike linked' }}</span><span>{{ minutes(ride.durationMin) }}</span><span v-if="ride.elevationM">{{ ride.elevationM }} m elevation</span></div></div><b class="record-value">{{ distance(ride.distanceKm) }}</b><div class="record-actions"><button type="button" @click="editRide(ride)">Edit</button><button type="button" class="danger" @click="deleteRide(ride.id, ride.title)">Delete</button></div></div></div>
                <div v-else class="empty-state"><strong>No rides found.</strong><span>Log a ride or adjust your search.</span></div>
              </article>
              <form v-if="rideFormOpen" class="panel form-panel ride-form-panel" @submit.prevent="saveRide">
                <div class="form-panel-heading"><div><p class="eyebrow">Session entry</p><h2>{{ rideForm.id ? 'Edit ride' : 'New ride' }}</h2></div><button type="button" class="ghost compact" @click="closeRideForm">Close</button></div>
                <label>Title<input v-model="rideForm.title" required /></label><label>Bike<select v-model="rideForm.bikeId"><option value="">No bike</option><option v-for="bike in bikes" :key="bike.id" :value="bike.id">{{ bike.name }}</option></select></label><label>Date<input v-model="rideForm.rideDate" type="date" required /></label><div class="form-row"><label>Distance km<input v-model.number="rideForm.distanceKm" type="number" min="0" step="0.1" required /></label><label>Duration min<input v-model.number="rideForm.durationMin" type="number" min="1" required /></label></div><label>Elevation m<input v-model.number="rideForm.elevationM" type="number" min="0" /></label><label>Route<input v-model="rideForm.route" /></label><label>Notes<textarea v-model="rideForm.notes"></textarea></label><div class="actions"><button class="primary">{{ rideForm.id ? 'Update ride' : 'Save ride' }}</button><button type="button" class="ghost" @click="resetRideForm">Clear</button></div>
              </form>
            </section>
          </section>

          <section v-if="currentView === 'gears'" class="entity-page equipment-page">
            <article class="gear-hero-panel"><img :src="gearHeroUrl" alt="DURA-ACE disc brake mechanical detail" class="gear-hero-image" /><div class="image-overlay gear-overlay"></div><div class="gear-hero-copy"><p class="eyebrow">Equipment system</p><h2>Mechanical assets,<br />kept in view.</h2><p>Track every component, its recorded value, condition, and place in the garage.</p></div></article>
            <section class="asset-readout-band" aria-label="Gear asset readouts"><article v-for="readout in gearReadouts" :key="readout.label" :class="['asset-readout', readout.tone ? `asset-readout-${readout.tone}` : '']"><span>{{ readout.label }}</span><strong>{{ readout.value }}</strong><small>{{ readout.detail }}</small></article></section>
            <section class="records-workspace" :class="{ 'form-open': gearFormOpen }">
              <article class="panel list-panel asset-records">
                <div class="panel-heading tools-heading asset-heading"><div><p class="eyebrow">Mechanical asset records</p><h2>Component ledger</h2><p>{{ filteredGears.length }} tracked items</p></div><div class="toolbar"><input v-model="gearSearch" class="search-input" placeholder="Search gear" /><select v-model="gearCategoryFilter" class="search-input"><option value="">All categories</option><option v-for="category in gearCategories" :key="category" :value="category">{{ category }}</option></select><button v-if="!gearFormOpen" type="button" class="ghost compact" @click="resetGearForm(); gearFormOpen = true">Add gear</button></div></div>
                <div v-if="filteredGears.length" class="record-list">
                  <div v-for="gear in filteredGears" :key="gear.id" class="gear-record-group">
                    <div class="record-card gear-asset-row">
                      <div class="record-main"><strong>{{ gear.name }}</strong><span>{{ gear.brand }} {{ gear.model || '' }}</span><div class="record-meta"><span class="tag">{{ gear.category }}</span><span :class="['tag', `tag-${conditionTone(gear.condition)}`]">{{ conditionLabel(gear.condition) }}</span><span>{{ gear.bike?.name || 'Unassigned' }}</span></div></div>
                      <div class="asset-value"><span>Current value</span><b>{{ money(gear.valuation?.currentValue || gear.purchasePrice) }}</b><small>Paid {{ money(gear.purchasePrice) }}</small></div>
                      <div class="asset-date"><span>Purchased</span><b>{{ toDateInput(gear.purchaseDate) }}</b></div>
                      <div class="record-actions"><button type="button" class="estimate-action" @click="openEstimator(gear)">{{ estimatorGearId === gear.id ? 'Close estimate' : 'Estimate value' }}</button><button type="button" @click="editGear(gear)">Edit</button><button type="button" class="danger" @click="deleteGear(gear.id, gear.name)">Delete</button></div>
                    </div>
                    <section v-if="estimatorGearId === gear.id" class="estimator-panel" aria-label="Value estimator">
                      <div class="estimator-heading"><div><p class="eyebrow">Rule-based preview</p><h3>Value estimator</h3><p>Preview only. This does not update the gear record.</p></div><button type="button" class="ghost compact" @click="clearEstimator">Close</button></div>
                      <div class="estimator-input-grid">
                        <label>Purchase price<input v-model.number="estimatorDraft.purchasePrice" type="number" min="0" step="0.01" @input="markEstimatorStale" /></label>
                        <label>Purchase date<input v-model="estimatorDraft.purchaseDate" type="date" @input="markEstimatorStale" /></label>
                        <label>Condition<select v-model="estimatorDraft.condition" @change="markEstimatorStale"><option v-for="option in gearConditionOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                        <label>Lifespan months<input v-model.number="estimatorDraft.expectedLifespanMonths" type="number" min="1" step="1" @input="markEstimatorStale" /></label>
                        <label>Residual rate (%)<input :value="residualRatePercent(estimatorDraft.minResidualRate)" type="number" min="0" max="100" step="1" inputmode="numeric" @input="updateEstimatorResidualRate" /></label>
                      </div>
                      <div class="estimator-actions"><button type="button" class="primary" :disabled="estimatorLoading" @click="calculateEstimator">{{ estimatorLoading ? 'Calculating...' : 'Calculate' }}</button><button type="button" class="ghost" :disabled="estimatorLoading" @click="resetEstimator">Reset to saved values</button><span v-if="estimatorStale" class="estimator-stale">Parameters changed. Calculate to refresh.</span></div>
                      <p v-if="estimatorError" class="error estimator-error">{{ estimatorError }}</p>
                      <div v-else-if="estimatorResult" class="estimator-result"><div class="estimate-primary"><span>Estimated value</span><strong>{{ money(estimatorResult.estimatedValue) }}</strong><small>{{ estimatorResult.confidence.replace('_', ' ') }}</small></div><div class="estimate-metric"><span>Retained rate</span><b>{{ (estimatorResult.retainedRate * 100).toFixed(0) }}%</b></div><div class="estimate-metric"><span>Value loss</span><b>{{ money(estimatorResult.valueLoss) }}</b></div><div class="estimate-metric"><span>Used months</span><b>{{ estimatorResult.usedMonths }}</b></div></div>
                      <div v-if="estimatorResult?.factors.length" class="estimator-factors"><span v-for="factor in estimatorResult.factors" :key="factor.key"><b>{{ factor.label }}</b>{{ estimatorFactorValue(factor) }}</span></div>
                      <div v-if="estimatorResult?.warnings.length" class="estimator-warnings"><span v-for="warning in estimatorResult.warnings" :key="warning">{{ warning }}</span></div>
                    </section>
                  </div>
                </div>
                <div v-else class="empty-state"><strong>No gear found.</strong><span>Add gear or adjust your search.</span></div>
              </article>
              <form v-if="gearFormOpen" class="panel form-panel gear-form-panel" @submit.prevent="saveGear">
                <div class="form-panel-heading"><div><p class="eyebrow">Asset entry</p><h2>{{ gearForm.id ? 'Edit gear' : 'New gear' }}</h2></div><button type="button" class="ghost compact" @click="closeGearForm">Close</button></div>
                <label>Name<input v-model="gearForm.name" required /></label>
                <label>Bike<select v-model="gearForm.bikeId"><option value="">Unassigned</option><option v-for="bike in bikes" :key="bike.id" :value="bike.id">{{ bike.name }}</option></select></label>
                <label>Category<select v-model="gearForm.category"><option v-for="category in gearCategories" :key="category">{{ category }}</option></select></label>
                <label>Brand<input v-model="gearForm.brand" required /></label>
                <label>Model<input v-model="gearForm.model" /></label>
                <div class="form-row">
                  <label>Purchase price<input v-model.number="gearForm.purchasePrice" type="number" min="0" step="0.01" required /></label>
                  <label>Lifespan months<input v-model.number="gearForm.expectedLifespanMonths" type="number" min="1" required /></label>
                </div>
                <label>Purchase date<input v-model="gearForm.purchaseDate" type="date" required /></label>
                <label>Condition<select v-model="gearForm.condition"><option v-for="option in gearConditionOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                <label>Residual rate (%)<input :value="residualRatePercent(gearForm.minResidualRate)" type="number" min="0" max="100" step="1" inputmode="numeric" @input="updateGearFormResidualRate" /></label>
                <label>Notes<textarea v-model="gearForm.notes"></textarea></label>
                <div class="actions">
                  <button class="primary">{{ gearForm.id ? 'Update gear' : 'Save gear' }}</button>
                  <button type="button" class="ghost" @click="resetGearForm">Clear</button>
                </div>
              </form>
            </section>
          </section>

          <section v-if="currentView === 'maintenance'" class="entity-page">
            <section class="stat-strip">
              <article v-for="stat in maintenanceStats" :key="stat.label"><span>{{ stat.label }}</span><strong>{{ stat.value }}</strong></article>
            </section>
            <section class="entity-grid">
              <form class="panel form-panel" @submit.prevent="saveMaintenance">
                <h2>{{ maintenanceForm.id ? 'Edit service' : 'Add service' }}</h2>
                <label>Gear<select v-model="maintenanceForm.gearId" required><option value="">Select gear</option><option v-for="gear in gears" :key="gear.id" :value="gear.id">{{ gear.name }}</option></select></label>
                <label>Type<select v-model="maintenanceForm.type"><option v-for="type in maintenanceTypes" :key="type">{{ type }}</option></select></label>
                <label>Title<input v-model="maintenanceForm.title" required /></label>
                <label>Date<input v-model="maintenanceForm.maintenanceDate" type="date" required /></label>
                <div class="form-row">
                  <label>Cost<input v-model.number="maintenanceForm.cost" type="number" min="0" step="0.01" /></label>
                  <label>Next due<input v-model="maintenanceForm.nextDueDate" type="date" /></label>
                </div>
                <label>Notes<textarea v-model="maintenanceForm.notes"></textarea></label>
                <div class="actions">
                  <button class="primary">{{ maintenanceForm.id ? 'Update service' : 'Save service' }}</button>
                  <button type="button" class="ghost" @click="resetMaintenanceForm">Clear</button>
                </div>
              </form>
              <article class="panel list-panel">
                <div class="panel-heading">
                  <div><h2>Service history</h2><p>{{ filteredMaintenance.length }} records shown</p></div>
                  <input v-model="maintenanceSearch" class="search-input" placeholder="Search service" />
                </div>
                <div v-if="filteredMaintenance.length" class="record-list">
                  <div v-for="item in filteredMaintenance" :key="item.id" class="record-card record-card-data">
                    <div class="record-main">
                      <strong>{{ item.title }}</strong>
                      <span>{{ item.gear?.name || 'Gear' }}</span>
                      <div class="record-meta">
                        <span class="tag">{{ item.type }}</span>
                        <span>{{ toDateInput(item.maintenanceDate) }}</span>
                        <span v-if="item.nextDueDate" :class="['tag', `tag-${serviceTone(item)}`]">due {{ relativeDue(item.nextDueDate) }}</span>
                      </div>
                    </div>
                    <b class="record-value">{{ money(item.cost) }}</b>
                    <div class="record-actions">
                      <button type="button" @click="editMaintenance(item)">Edit</button>
                      <button type="button" class="danger" @click="deleteMaintenance(item.id, item.title)">Delete</button>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <strong>No service records found.</strong>
                  <span>Add a maintenance entry or adjust your search.</span>
                </div>
              </article>
            </section>
          </section>

          <section v-if="currentView === 'insights'" class="entity-page insights-page">
            <section class="stat-strip">
              <article v-for="stat in insightStats" :key="stat.label"><span>{{ stat.label }}</span><strong>{{ stat.value }}</strong></article>
            </section>
            <section class="insight-grid">
              <article class="panel">
                <div class="panel-heading"><div><p class="eyebrow">Training signal</p><h2>Monthly ride distance</h2></div></div>
                <div v-if="insights?.monthlyRideDistance?.length" class="bar-list">
                  <div v-for="row in insights.monthlyRideDistance" :key="row.month" class="bar-row">
                    <span>{{ row.month }}</span>
                    <div><i :style="{ width: barWidth(row.distanceKm, maxMonthlyDistance) }"></i></div>
                    <b>{{ distance(row.distanceKm) }}</b>
                  </div>
                </div>
                <div v-else class="empty-state"><strong>No monthly ride data.</strong><span>Log rides to build a trend.</span></div>
              </article>
              <article class="panel">
                <div class="panel-heading"><div><p class="eyebrow">Bike usage</p><h2>Distance by bike</h2></div></div>
                <div v-if="insights?.rideDistanceByBike?.length" class="bar-list">
                  <div v-for="row in insights.rideDistanceByBike" :key="row.bike" class="bar-row">
                    <span>{{ row.bike }}</span>
                    <div><i :style="{ width: barWidth(row.distanceKm, maxBikeDistance) }"></i></div>
                    <b>{{ distance(row.distanceKm) }}</b>
                  </div>
                </div>
                <div v-else class="empty-state"><strong>No bike split yet.</strong><span>Assign rides to bikes for sharper insights.</span></div>
              </article>
              <article class="panel">
                <div class="panel-heading"><div><p class="eyebrow">Garage value</p><h2>Asset share</h2></div></div>
                <div v-if="insights?.categoryAssetShare?.length" class="bar-list">
                  <div v-for="row in insights.categoryAssetShare" :key="row.category" class="bar-row">
                    <span>{{ row.category }}</span>
                    <div><i :style="{ width: barWidth(row.value, maxAssetShare) }"></i></div>
                    <b>{{ money(row.value) }}</b>
                  </div>
                </div>
                <div v-else class="empty-state"><strong>No asset share yet.</strong><span>Add gear to see value distribution.</span></div>
              </article>
              <article class="panel">
                <div class="panel-heading"><div><p class="eyebrow">Rules</p><h2>Operating notes</h2></div></div>
                <div v-if="insights?.advice?.length" class="advice-list">
                  <p v-for="item in insights.advice" :key="item" class="notice">{{ item }}</p>
                </div>
                <div v-else class="empty-state"><strong>No notes yet.</strong><span>More rides and gear records will unlock useful signals.</span></div>
              </article>
            </section>
          </section>
        </div>
      </Transition>
    </section>
  </main>
</template>
