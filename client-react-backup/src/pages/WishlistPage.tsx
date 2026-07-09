import { FormEvent, useEffect, useState } from 'react';
import { wishlistApi, WishlistFilters } from '../api/wishlistApi';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Input, Select, Textarea } from '../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State';
import { GearCategory } from '../types/gear';
import { Priority, WishlistInput, WishlistItem, WishlistStatus } from '../types/wishlist';
import { formatCurrency } from '../utils/formatters';

const categories: GearCategory[] = ['bike', 'wheelset', 'computer', 'helmet', 'shoes', 'clothing', 'tool', 'drivetrain', 'other'];
const priorities: Priority[] = ['low', 'medium', 'high'];
const statuses: WishlistStatus[] = ['planned', 'watching', 'purchased', 'paused'];

const emptyForm: WishlistInput = {
  name: '',
  category: 'wheelset',
  brand: '',
  estimatedPrice: 0,
  priority: 'medium',
  plannedMonth: '',
  status: 'planned',
  reason: '',
  notes: ''
};

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [filters, setFilters] = useState<WishlistFilters>({});
  const [budget, setBudget] = useState(0);
  const [form, setForm] = useState<WishlistInput>(emptyForm);
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [deleting, setDeleting] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await wishlistApi.list(filters);
      setItems(response.data);
      setBudget(response.meta?.budget || response.data.reduce((sum, item) => sum + item.estimatedPrice, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wishlist failed to load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.category, filters.priority, filters.status]);

  function edit(item: WishlistItem) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      brand: item.brand || '',
      estimatedPrice: item.estimatedPrice,
      priority: item.priority,
      plannedMonth: item.plannedMonth || '',
      status: item.status,
      reason: item.reason || '',
      notes: item.notes || ''
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
      if (editing) await wishlistApi.update(editing.id, form);
      else await wishlistApi.create(form);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item: WishlistItem, status: WishlistStatus) {
    await wishlistApi.update(item.id, { status });
    await load();
  }

  async function confirmDelete() {
    if (!deleting) return;
    await wishlistApi.remove(deleting.id);
    setDeleting(null);
    await load();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
      <Card>
        <h2 className="text-xl font-black">{editing ? 'Edit wishlist item' : 'Add wishlist item'}</h2>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as GearCategory })}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Input label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <Input label="Estimated price" type="number" min="0" value={form.estimatedPrice} onChange={(e) => setForm({ ...form, estimatedPrice: Number(e.target.value) })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              {priorities.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WishlistStatus })}>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </div>
          <Input label="Planned month" type="month" value={form.plannedMonth} onChange={(e) => setForm({ ...form, plannedMonth: e.target.value })} />
          <Textarea label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex gap-3">
            <Button disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add item'}</Button>
            {editing ? <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button> : null}
          </div>
        </form>
      </Card>
      <section className="grid gap-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black">Budget in view</h3>
            <p className="text-2xl font-black text-chain">{formatCurrency(budget)}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Category" value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Priority" value={filters.priority || ''} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="">All</option>
              {priorities.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Status" value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </div>
        </Card>
        {loading ? <LoadingState label="Loading wishlist..." /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="No wishlist items match this view." /> : (
          <div className="grid gap-3">
            {items.map((item) => (
              <Card key={item.id} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{item.name}</h3>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-chain">{item.priority}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{item.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.brand || 'Any brand'} · {item.category} · {item.plannedMonth || 'No month'}</p>
                  <p className="mt-2 text-sm font-bold text-chain">{formatCurrency(item.estimatedPrice)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select label="Status" value={item.status} onChange={(e) => changeStatus(item, e.target.value as WishlistStatus)}>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </Select>
                  <Button variant="secondary" onClick={() => edit(item)}>Edit</Button>
                  <Button variant="danger" onClick={() => setDeleting(item)}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      {deleting ? <ConfirmDialog title="Delete wishlist item?" message="This upgrade plan will be removed from the wishlist budget." onCancel={() => setDeleting(null)} onConfirm={confirmDelete} /> : null}
    </div>
  );
}
