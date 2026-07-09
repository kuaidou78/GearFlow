import { Maintenance, MaintenanceInput } from '../types/maintenance';
import { queryString, request } from './httpClient';

export type MaintenanceFilters = {
  gearId?: string;
  type?: string;
  due?: string;
};

export const maintenanceApi = {
  list: (filters: MaintenanceFilters = {}) => request<Maintenance[]>(`/api/maintenance${queryString(filters)}`),
  create: (body: MaintenanceInput) => request<Maintenance>('/api/maintenance', { method: 'POST', body }),
  update: (id: string, body: MaintenanceInput) => request<Maintenance>(`/api/maintenance/${id}`, { method: 'PUT', body }),
  remove: (id: string) => request<{ deleted: boolean }>(`/api/maintenance/${id}`, { method: 'DELETE' })
};
