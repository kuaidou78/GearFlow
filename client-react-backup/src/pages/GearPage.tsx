import { FormEvent, useEffect, useState } from 'react';
import { gearApi, GearFilters } from '../api/gearApi';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Input, Select, Textarea } from '../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State';
import { Gear, GearCategory, GearCondition, GearInput } from '../types/gear';
import { dateInputValue, formatCurrency, formatDate, percent } from '../utils/formatters';

const categories: GearCategory[] = ['bike', 'wheelset', 'computer', 'helmet', 'shoes', 'clothing', 'tool', 'drivetrain', 'other'];
const conditions: GearCondition[] = ['new', 'excellent', 'good', 'fair', 'poor'];

const emptyForm: GearInput = {
  name: '',
  category: 'bike',
  brand: '',
  model: '',
  purchasePrice: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
  expectedLifespanMonths: 60,
  condition: 'good',
  minResidualRate: 0.2,
  notes: ''
};

export function GearPage() {
  const [gears, setGears] = useState<Gear[]>([]);
  const [filters, setFilters] = useState<GearFilters>({ sort: 'createdAt_desc' });
  const [form, setForm] = useState<GearInput>(emptyForm);
  const [editing, setEditing] = useState<Gear | null>(null);
  const [deleting, setDeleting] = useState<Gear | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await gearApi.list(filters);
      setGears(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gear failed to load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.category, filters.condition, filters.search, filters.sort]);

  function editGear(gear: Gear) {
    setEditing(gear);
    setForm({
      name: gear.name,
      category: gear.category,
      brand: gear.brand,
      model: gear.model || '',
      purchasePrice: gear.purchasePrice,
      purchaseDate: dateInputValue(gear.purchaseDate),
      expectedLifespanMonths: gear.expectedLifespanMonths,
      condition: gear.condition,
      minResidualRate: gear.minResidualRate,
      notes: gear.notes || ''
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await gearApi.update(editing.id, form);
      else await gearApi.create(form);
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
    await gearApi.remove(deleting.id);
    setDeleting(null);
    await load();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
      <Card>
        <h2 className="text-xl font-black">{editing ? 'Edit gear' : 'Add gear'}</h2>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as GearCategory })}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as GearCondition })}>
              {conditions.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
            <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Purchase price" type="number" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            <Input label="Purchase date" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Lifespan months" type="number" min="1" value={form.expectedLifespanMonths} onChange={(e) => setForm({ ...form, expectedLifespanMonths: Number(e.target.value) })} />
            <Input label="Min residual rate" type="number" min="0" max="1" step="0.01" value={form.minResidualRate} onChange={(e) => setForm({ ...form, minResidualRate: Number(e.target.value) })} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex gap-3">
            <Button disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add gear'}</Button>
            {editing ? <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button> : null}
          </div>
        </form>
      </Card>

      <section className="grid gap-4">
        <Card>
          <div className="grid gap-3 md:grid-cols-4">
            <Input label="Search" value={filters.search || ''} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="brand, model, name" />
            <Select label="Category" value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Condition" value={filters.condition || ''} onChange={(e) => setFilters({ ...filters, condition: e.target.value })}>
              <option value="">All</option>
              {conditions.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Sort" value={filters.sort || 'createdAt_desc'} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
              <option value="createdAt_desc">Newest</option>
              <option value="price_desc">Price high</option>
              <option value="price_asc">Price low</option>
              <option value="purchaseDate_asc">Oldest purchase</option>
            </Select>
          </div>
        </Card>
        {loading ? <LoadingState label="Loading gear..." /> : error ? <ErrorState message={error} onRetry={load} /> : gears.length === 0 ? <EmptyState title="No gear matches this view." /> : (
          <div className="grid gap-3">
            {gears.map((gear) => (
              <Card key={gear.id} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{gear.name}</h3>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-chain">{gear.category}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{gear.condition}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{gear.brand} {gear.model || ''} · purchased {formatDate(gear.purchaseDate)}</p>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <span>Paid <strong>{formatCurrency(gear.purchasePrice)}</strong></span>
                    <span>Value <strong>{formatCurrency(gear.valuation.currentValue)}</strong></span>
                    <span>Depreciated <strong>{percent(gear.valuation.depreciationRate)}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => editGear(gear)}>Edit</Button>
                  <Button variant="danger" onClick={() => setDeleting(gear)}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message="该操作会同时删除关联保养记录。删除后无法从界面恢复，请确认这件装备和它的保养历史都可以删除。"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
