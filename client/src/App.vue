<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { get, post, put, remove } from './api';

type View = 'dashboard' | 'rides' | 'bikes' | 'gears' | 'maintenance' | 'insights';

type User = { id: string; name: string; email: string; role: string };
type Bike = { id: string; name: string; brand: string; model?: string; bikeType: string; purchaseDate?: string; notes?: string; _count?: { rides: number; gears: number } };
type Ride = { id: string; title: string; rideDate: string; distanceKm: number; durationMin: number; elevationM: number; route?: string; notes?: string; bikeId?: string; bike?: Pick<Bike, 'id' | 'name'> };
type Gear = { id: string; name: string; category: string; brand: string; model?: string; purchasePrice: number; purchaseDate: string; expectedLifespanMonths: number; condition: string; minResidualRate: number; notes?: string; bikeId?: string; bike?: Pick<Bike, 'id' | 'name'>; valuation?: { currentValue: number; depreciationAmount: number } };
type Maintenance = { id: string; gearId: string; type: string; title: string; maintenanceDate: string; cost: number; nextDueDate?: string; notes?: string; gear?: Pick<Gear, 'id' | 'name' | 'category' | 'brand'> };

const views: { key: View; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'rides', label: 'Rides' },
  { key: 'bikes', label: 'Bikes' },
  { key: 'gears', label: 'Gear' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'insights', label: 'Insights' }
];

const gearCategories = ['bike', 'wheelset', 'computer', 'helmet', 'shoes', 'clothing', 'tool', 'drivetrain', 'other'];
const conditions = ['new', 'excellent', 'good', 'fair', 'poor'];
const maintenanceTypes = ['cleaning', 'tires', 'chain', 'brakes', 'drivetrain', 'full_service', 'other'];

const currentView = ref<View>('dashboard');
const user = ref<User | null>(null);
const authMode = ref<'login' | 'register'>('login');
const loading = ref(false);
const error = ref('');
const notice = ref('');

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

const activeTitle = computed(() => views.find((view) => view.key === currentView.value)?.label || 'Dashboard');
const totalDistance = computed(() => rides.value.reduce((sum, ride) => sum + Number(ride.distanceKm || 0), 0));
const totalGearValue = computed(() => gears.value.reduce((sum, gear) => sum + Number(gear.valuation?.currentValue || gear.purchasePrice || 0), 0));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function money(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function distance(value: number) {
  return `${Number(value || 0).toFixed(1)} km`;
}

function minutes(value: number) {
  const hours = Math.floor(Number(value || 0) / 60);
  const mins = Number(value || 0) % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function resetBikeForm() {
  Object.assign(bikeForm, { id: '', name: '', brand: '', model: '', bikeType: 'road', purchaseDate: '', notes: '' });
}

function resetRideForm() {
  Object.assign(rideForm, { id: '', bikeId: bikes.value[0]?.id || '', title: '', rideDate: today(), distanceKm: 0, durationMin: 60, elevationM: 0, route: '', notes: '' });
}

function resetGearForm() {
  Object.assign(gearForm, { id: '', bikeId: '', name: '', category: 'wheelset', brand: '', model: '', purchasePrice: 0, purchaseDate: today(), expectedLifespanMonths: 48, condition: 'good', minResidualRate: 0.2, notes: '' });
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

async function saveBike() {
  await runAction('Saving bike...', bikeForm.id ? 'Bike updated.' : 'Bike added.', async () => {
    const body = { ...bikeForm };
    if (bikeForm.id) await put(`/api/bikes/${bikeForm.id}`, body);
    else await post('/api/bikes', body);
    resetBikeForm();
    await loadWorkspace();
  });
}

function editBike(item: Bike) {
  Object.assign(bikeForm, { ...item, purchaseDate: toDateInput(item.purchaseDate), notes: item.notes || '', model: item.model || '' });
}

async function deleteBike(id: string) {
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
    await loadWorkspace();
  });
}

function editRide(item: Ride) {
  Object.assign(rideForm, { ...item, bikeId: item.bikeId || item.bike?.id || '', rideDate: toDateInput(item.rideDate), route: item.route || '', notes: item.notes || '' });
}

async function deleteRide(id: string) {
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
    await loadWorkspace();
  });
}

function editGear(item: Gear) {
  Object.assign(gearForm, { ...item, bikeId: item.bikeId || item.bike?.id || '', purchaseDate: toDateInput(item.purchaseDate), model: item.model || '', notes: item.notes || '' });
}

async function deleteGear(id: string) {
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

async function deleteMaintenance(id: string) {
  await runAction('Deleting service...', 'Service deleted.', async () => {
    await remove(`/api/maintenance/${id}`);
    await loadWorkspace();
  });
}

onMounted(async () => {
  try {
    const result = await get<{ user: User }>('/api/auth/me');
    user.value = result.data.user;
    await loadWorkspace();
  } catch {
    user.value = null;
  }
});
</script>

<template>
  <main v-if="!user" class="auth-screen">
    <section class="auth-panel">
      <div class="brand-lockup">
        <span class="chain-mark"></span>
        <p>GearFlow</p>
      </div>
      <h1>Ride records and gear service in one garage ledger.</h1>
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

  <main v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand-lockup">
        <span class="chain-mark"></span>
        <p>GearFlow</p>
      </div>
      <nav>
        <button v-for="view in views" :key="view.key" :class="{ active: currentView === view.key }" @click="currentView = view.key">
          {{ view.label }}
        </button>
      </nav>
      <div class="user-card">
        <strong>{{ user.name }}</strong>
        <span>{{ user.email }}</span>
        <button @click="logout">Logout</button>
      </div>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">Cycling management</p>
          <h1>{{ activeTitle }}</h1>
        </div>
        <button class="ghost" @click="loadWorkspace">Refresh</button>
      </header>

      <p v-if="error" class="error wide">{{ error }}</p>
      <p v-if="notice" class="notice action-notice">{{ notice }}</p>
      <p v-if="loading" class="loading">Loading current workspace...</p>

      <section v-if="currentView === 'dashboard'" class="grid dashboard-grid">
        <article class="metric dark">
          <span>Total distance</span>
          <strong>{{ distance(dashboard?.kpis?.rideDistanceTotal || totalDistance) }}</strong>
        </article>
        <article class="metric">
          <span>Bikes</span>
          <strong>{{ dashboard?.kpis?.bikeCount || bikes.length }}</strong>
        </article>
        <article class="metric">
          <span>Gear value</span>
          <strong>{{ money(dashboard?.kpis?.currentValueTotal || totalGearValue) }}</strong>
        </article>
        <article class="metric">
          <span>Maintenance spend</span>
          <strong>{{ money(dashboard?.kpis?.maintenanceTotal || 0) }}</strong>
        </article>

        <article class="panel span-2">
          <h2>Recent rides</h2>
          <div v-for="ride in rides.slice(0, 5)" :key="ride.id" class="list-row">
            <div>
              <strong>{{ ride.title }}</strong>
              <span>{{ toDateInput(ride.rideDate) }} · {{ ride.bike?.name || 'No bike' }}</span>
            </div>
            <b>{{ distance(ride.distanceKm) }}</b>
          </div>
        </article>
        <article class="panel">
          <h2>Upcoming service</h2>
          <div v-for="item in maintenance.slice(0, 4)" :key="item.id" class="list-row compact">
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.gear?.name || 'Gear' }}</span>
            </div>
          </div>
        </article>
      </section>

      <section v-if="currentView === 'bikes'" class="split">
        <form class="panel form-panel" @submit.prevent="saveBike">
          <h2>{{ bikeForm.id ? 'Edit bike' : 'Add bike' }}</h2>
          <label>Name<input v-model="bikeForm.name" required /></label>
          <label>Brand<input v-model="bikeForm.brand" required /></label>
          <label>Model<input v-model="bikeForm.model" /></label>
          <label>Type<input v-model="bikeForm.bikeType" required /></label>
          <label>Purchase date<input v-model="bikeForm.purchaseDate" type="date" /></label>
          <label>Notes<textarea v-model="bikeForm.notes"></textarea></label>
          <div class="actions">
            <button class="primary">Save bike</button>
            <button type="button" class="ghost" @click="resetBikeForm">Clear</button>
          </div>
        </form>
        <article class="panel">
          <h2>Bike garage</h2>
          <div v-for="bike in bikes" :key="bike.id" class="record">
            <div>
              <strong>{{ bike.name }}</strong>
              <span>{{ bike.brand }} {{ bike.model }} · {{ bike.bikeType }}</span>
            </div>
            <div class="record-actions">
              <button @click="editBike(bike)">Edit</button>
              <button class="danger" @click="deleteBike(bike.id)">Delete</button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="currentView === 'rides'" class="split">
        <form class="panel form-panel" @submit.prevent="saveRide">
          <h2>{{ rideForm.id ? 'Edit ride' : 'Add ride' }}</h2>
          <label>Title<input v-model="rideForm.title" required /></label>
          <label>Bike<select v-model="rideForm.bikeId"><option value="">No bike</option><option v-for="bike in bikes" :key="bike.id" :value="bike.id">{{ bike.name }}</option></select></label>
          <label>Date<input v-model="rideForm.rideDate" type="date" required /></label>
          <label>Distance km<input v-model.number="rideForm.distanceKm" type="number" min="0" step="0.1" required /></label>
          <label>Duration min<input v-model.number="rideForm.durationMin" type="number" min="1" required /></label>
          <label>Elevation m<input v-model.number="rideForm.elevationM" type="number" min="0" /></label>
          <label>Route<input v-model="rideForm.route" /></label>
          <label>Notes<textarea v-model="rideForm.notes"></textarea></label>
          <div class="actions">
            <button class="primary">Save ride</button>
            <button type="button" class="ghost" @click="resetRideForm">Clear</button>
          </div>
        </form>
        <article class="panel">
          <h2>Ride log</h2>
          <div v-for="ride in rides" :key="ride.id" class="record">
            <div>
              <strong>{{ ride.title }}</strong>
              <span>{{ toDateInput(ride.rideDate) }} · {{ ride.bike?.name || 'No bike' }} · {{ minutes(ride.durationMin) }}</span>
            </div>
            <b>{{ distance(ride.distanceKm) }}</b>
            <div class="record-actions">
              <button @click="editRide(ride)">Edit</button>
              <button class="danger" @click="deleteRide(ride.id)">Delete</button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="currentView === 'gears'" class="split">
        <form class="panel form-panel" @submit.prevent="saveGear">
          <h2>{{ gearForm.id ? 'Edit gear' : 'Add gear' }}</h2>
          <label>Name<input v-model="gearForm.name" required /></label>
          <label>Bike<select v-model="gearForm.bikeId"><option value="">Unassigned</option><option v-for="bike in bikes" :key="bike.id" :value="bike.id">{{ bike.name }}</option></select></label>
          <label>Category<select v-model="gearForm.category"><option v-for="category in gearCategories" :key="category">{{ category }}</option></select></label>
          <label>Brand<input v-model="gearForm.brand" required /></label>
          <label>Model<input v-model="gearForm.model" /></label>
          <label>Purchase price<input v-model.number="gearForm.purchasePrice" type="number" min="0" step="0.01" required /></label>
          <label>Purchase date<input v-model="gearForm.purchaseDate" type="date" required /></label>
          <label>Lifespan months<input v-model.number="gearForm.expectedLifespanMonths" type="number" min="1" required /></label>
          <label>Condition<select v-model="gearForm.condition"><option v-for="condition in conditions" :key="condition">{{ condition }}</option></select></label>
          <label>Residual rate<input v-model.number="gearForm.minResidualRate" type="number" min="0" max="1" step="0.01" /></label>
          <label>Notes<textarea v-model="gearForm.notes"></textarea></label>
          <div class="actions">
            <button class="primary">Save gear</button>
            <button type="button" class="ghost" @click="resetGearForm">Clear</button>
          </div>
        </form>
        <article class="panel">
          <h2>Gear ledger</h2>
          <div v-for="gear in gears" :key="gear.id" class="record">
            <div>
              <strong>{{ gear.name }}</strong>
              <span>{{ gear.brand }} · {{ gear.category }} · {{ gear.bike?.name || 'No bike' }}</span>
            </div>
            <b>{{ money(gear.valuation?.currentValue || gear.purchasePrice) }}</b>
            <div class="record-actions">
              <button @click="editGear(gear)">Edit</button>
              <button class="danger" @click="deleteGear(gear.id)">Delete</button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="currentView === 'maintenance'" class="split">
        <form class="panel form-panel" @submit.prevent="saveMaintenance">
          <h2>{{ maintenanceForm.id ? 'Edit service' : 'Add service' }}</h2>
          <label>Gear<select v-model="maintenanceForm.gearId" required><option value="">Select gear</option><option v-for="gear in gears" :key="gear.id" :value="gear.id">{{ gear.name }}</option></select></label>
          <label>Type<select v-model="maintenanceForm.type"><option v-for="type in maintenanceTypes" :key="type">{{ type }}</option></select></label>
          <label>Title<input v-model="maintenanceForm.title" required /></label>
          <label>Date<input v-model="maintenanceForm.maintenanceDate" type="date" required /></label>
          <label>Cost<input v-model.number="maintenanceForm.cost" type="number" min="0" step="0.01" /></label>
          <label>Next due<input v-model="maintenanceForm.nextDueDate" type="date" /></label>
          <label>Notes<textarea v-model="maintenanceForm.notes"></textarea></label>
          <div class="actions">
            <button class="primary">Save service</button>
            <button type="button" class="ghost" @click="resetMaintenanceForm">Clear</button>
          </div>
        </form>
        <article class="panel">
          <h2>Service history</h2>
          <div v-for="item in maintenance" :key="item.id" class="record">
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.gear?.name || 'Gear' }} · {{ toDateInput(item.maintenanceDate) }} · {{ item.type }}</span>
            </div>
            <b>{{ money(item.cost) }}</b>
            <div class="record-actions">
              <button @click="editMaintenance(item)">Edit</button>
              <button class="danger" @click="deleteMaintenance(item.id)">Delete</button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="currentView === 'insights'" class="grid insight-grid">
        <article class="panel">
          <h2>Monthly ride distance</h2>
          <div v-for="row in insights?.monthlyRideDistance || []" :key="row.month" class="bar-row">
            <span>{{ row.month }}</span>
            <div><i :style="{ width: Math.min(100, row.distanceKm) + '%' }"></i></div>
            <b>{{ distance(row.distanceKm) }}</b>
          </div>
        </article>
        <article class="panel">
          <h2>Distance by bike</h2>
          <div v-for="row in insights?.rideDistanceByBike || []" :key="row.bike" class="list-row">
            <div><strong>{{ row.bike }}</strong><span>{{ row.count }} rides</span></div>
            <b>{{ distance(row.distanceKm) }}</b>
          </div>
        </article>
        <article class="panel">
          <h2>Asset share</h2>
          <div v-for="row in insights?.categoryAssetShare || []" :key="row.category" class="list-row">
            <div><strong>{{ row.category }}</strong><span>{{ row.count }} items</span></div>
            <b>{{ money(row.value) }}</b>
          </div>
        </article>
        <article class="panel">
          <h2>Rules</h2>
          <p v-for="item in insights?.advice || []" :key="item" class="notice">{{ item }}</p>
        </article>
      </section>
    </section>
  </main>
</template>
