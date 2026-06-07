const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(body.error || 'Request failed', res.status);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET' }, token),

  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),

  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE' }, token),

  // Auth endpoints
  login: (email: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: () => request<any>('/auth/logout', { method: 'POST' }),

  getMe: (token: string) => request<any>('/auth/me', { method: 'GET' }, token),

  // API Keys
  createApiKey: (name: string, scopes?: string[], token?: string) =>
    request<any>('/api/keys', { method: 'POST', body: JSON.stringify({ name, scopes }) }, token),

  listApiKeys: (token?: string) =>
    request<any[]>('/api/keys', { method: 'GET' }, token),

  revokeApiKey: (id: string, token?: string) =>
    request<any>(`/api/keys/${id}`, { method: 'DELETE' }, token),

  getKeyUsage: (id: string, period?: string, token?: string) =>
    request<any>(`/api/keys/${id}/usage?period=${period || '7d'}`, { method: 'GET' }, token),

  // Metrics
  getUsage: (period?: string, token?: string) =>
    request<any>(`/api/metrics/usage?period=${period || '7d'}`, { method: 'GET' }, token),

  getQuotas: (token?: string) =>
    request<any>('/api/metrics/quotas', { method: 'GET' }, token),

  getBreakdown: (period?: string, token?: string) =>
    request<any>(`/api/metrics/breakdown?period=${period || '7d'}`, { method: 'GET' }, token),

  // Billing
  createCheckout: (tier: string, token?: string) =>
    request<any>('/api/billing/create-checkout', { method: 'POST', body: JSON.stringify({ tier }) }, token),

  createPortal: (token?: string) =>
    request<any>('/api/billing/portal', { method: 'POST' }, token),

  // Profile
  updateProfile: (data: any, token?: string) =>
    request<any>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }, token),
};
