import { request } from './httpClient';

export type Health = {
  ok: boolean;
  timestamp: string;
};

export type Status = {
  api: string;
  database: string;
  env: string;
  port: number;
  version: string;
  uptimeSeconds: number;
  checkedAt: string;
};

export const statusApi = {
  health: () => request<Health>('/api/health'),
  status: () => request<Status>('/api/status')
};
