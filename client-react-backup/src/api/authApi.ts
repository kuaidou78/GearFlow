import { request } from './httpClient';
import { DemoUser } from '../types/auth';

export const authApi = {
  login: (email: string, password: string) => request<{ user: DemoUser }>('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: DemoUser }>('/api/auth/me')
};
