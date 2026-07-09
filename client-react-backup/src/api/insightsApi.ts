import { InsightsOverview } from '../types/insights';
import { request } from './httpClient';

export const insightsApi = {
  overview: () => request<InsightsOverview>('/api/insights/overview')
};
