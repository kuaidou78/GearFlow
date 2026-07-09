import { FormEvent, useEffect, useState } from 'react';
import { gearApi } from '../api/gearApi';
import { maintenanceApi, MaintenanceFilters } from '../api/maintenanceApi';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Input, Select, Textarea } from '../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State';
import { Gear } from '../types/gear';
import { Maintenance, MaintenanceInput, MaintenanceType } from '../types/maintenance';
import { dateInputValue, formatCurrency, formatDate } from '../utils/formatters';

const types: MaintenanceType[] = ['cleaning', 'tires', 'chain', 'brakes', 'drivetrain', 'full_service', 'other'];

const emptyForm: MaintenanceInput = {
  gearId: '',
  type: 'cleaning',
  title: '',
  maintenanceDate: new Date().toISOString().slice(0, 10),
  cost: 0,
  nextDueDate: '',
  notes: ''
};

export function MaintenancePage() {
  const [items, setItems] = useState<Maintenance[]>([]);
  const [gears, setGears] = useState<Gear[]>([]);
  const [filters, setFilters] = useState<MaintenanceFilters>({});
  const [form, setForm] = useState<MaintenanceInput>(emptyForm);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [deleting, setDeleting] = useState<Maintenance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [maintenanceResponse, gearResponse] = await Promise.all([maintenanceApi.list(filters), gearApi.list()]);
      setItems(maintenanceResponse.data);
      setGears(gearResponse.data);
      if (!form.gearId && gearResponse.data[0]) setForm((current) => ({ ...current, gearId: gearResponse.data[0].id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Maintenance failed to load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.gearId, filters.type, filters.due]);

  function edit(item: Maintenance) {
    setEditing(item);
    setForm({
      gearId: item.gearId,
      type: item.type,
      title: item.title,
      maintenanceDate: dateInputValue(item.maintenanceDate),
      cost: item.cost,
      nextDueDate: dateInputValue(item.nextDueDate),
      notes: item.notes || ''
    });
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, gearId: gears[0]?.id || '' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await maintenanceApi.update(editing.id, form);
      else await maintenanceApi.create(form);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await maintenanceApi.remove(deleting.id);
    setDeleting(null);
    await load();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
      <Card>
        <h2 className="text-xl font-black">{editing ? 'Edit maintenance' : 'Add maintenance'}</h2>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <Select label="Gear" value={form.gearId} onChange={(e) => setForm({ ...form, gearId: e.target.value })} required>
            <option value="">Select gear</option>
            {gears.map((gear) => <option key={gear.id} value={gear.id}>{gear.name}</option>)}
          </Select>
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}>
            {types.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Maintenance date" type="date" value={form.maintenanceDate} onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })} />
            <Input label="Next due date" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
          </div>
          <Input label="Cost" type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex gap-3">
            <Button disabled={saving || gears.length === 0}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add record'}</Button>
            {editing ? <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button> : null}
          </div>
        </form>
      </Card>
      <section className="grid gap-4">
        <Card>
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Gear" value={filters.gearId || ''} onChange={(e) => setFilters({ ...filters, gearId: e.target.value })}>
              <option value="">All</option>
              {gears.map((gear) => <option key={gear.id} value={gear.id}>{gear.name}</option>)}
            </Select>
            <Select label="Type" value={filters.type || ''} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="">All</option>
              {types.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Due" value={filters.due || ''} onChange={(e) => setFilters({ ...filters, due: e.target.value })}>
              <option value="">All</option>
              <option value="upcoming">Upcoming</option>
            </Select>
          </div>
        </Card>
        {loading ? <LoadingState label="Loading maintenance..." /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="No maintenance records match this view." /> : (
          <div className="grid gap-3">
            {items.map((item) => (
              <Card key={item.id} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{item.title}</h3>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{item.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.gear?.name || 'Unknown gear'} · {formatDate(item.maintenanceDate)} · {formatCurrency(item.cost)}</p>
                  <p className="mt-2 text-sm text-slate-500">Next due: {formatDate(item.nextDueDate)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => edit(item)}>Edit</Button>
                  <Button variant="danger" onClick={() => setDeleting(item)}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      {deleting ? <ConfirmDialog title="Delete maintenance record?" message="This maintenance record will be removed from the service history." onCancel={() => setDeleting(null)} onConfirm={confirmDelete} /> : null}
    </div>
  );
}
