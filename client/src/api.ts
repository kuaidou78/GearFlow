export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export function get<T>(path: string, options: RequestInit = {}) {
  return request<T>(path, options);
}

export function post<T>(path: string, body?: unknown, options: RequestInit = {}) {
  return request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body || {}) });
}

export function put<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body || {}) });
}

export function remove<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}
