import { Gear, GearInput } from '../types/gear';
import { queryString, request } from './httpClient';

export type GearFilters = {
  search?: string;
  category?: string;
  condition?: string;
  sort?: string;
};

export const gearApi = {
  list: (filters: GearFilters = {}) => request<Gear[]>(`/api/gears${queryString(filters)}`),
  create: (body: GearInput) => request<Gear>('/api/gears', { method: 'POST', body }),
  update: (id: string, body: GearInput) => request<Gear>(`/api/gears/${id}`, { method: 'PUT', body }),
  remove: (id: string) => request<{ deleted: boolean }>(`/api/gears/${id}`, { method: 'DELETE' })
};
