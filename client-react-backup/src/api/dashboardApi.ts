import { DashboardSummary } from '../types/dashboard';
import { request } from './httpClient';

export const dashboardApi = {
  summary: () => request<DashboardSummary>('/api/dashboard/summary')
};
