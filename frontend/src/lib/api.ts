const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  error?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const json: ApiResponse<T> = await res.json();
  if (json.status === 'error' || !res.ok) {
    throw new Error(json.error || `HTTP error ${res.status}`);
  }
  return json.data;
}

export const api = {
  baseUrl: API_BASE,

  getCultures: () => request<any[]>('/api/cultures'),

  createProject: (formData: FormData) =>
    request<any>('/api/projects', {
      method: 'POST',
      body: formData,
    }),

  getProject: (id: string) => request<any>(`/api/projects/${id}`),

  extractProject: (id: string) =>
    request<any>(`/api/projects/${id}/extract`, { method: 'POST' }),

  getEntities: (id: string) => request<any>(`/api/projects/${id}/entities`),

  updateEntities: (id: string, payload: any) =>
    request<any>(`/api/projects/${id}/entities`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  createPlan: (id: string, payload: { culture_id: string; setting: string; output_script: string }) =>
    request<any>(`/api/projects/${id}/plan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPlan: (id: string) => request<any>(`/api/projects/${id}/plan`),

  approvePlan: (id: string, payload?: any) =>
    request<any>(`/api/projects/${id}/plan/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload || {}),
    }),

  runAdaptation: (id: string) =>
    request<any>(`/api/projects/${id}/adapt`, { method: 'POST' }),

  getAdapted: (id: string) => request<any>(`/api/projects/${id}/adapted`),

  approveAdapted: (id: string, payload?: any) =>
    request<any>(`/api/projects/${id}/adapted/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload || {}),
    }),

  generateVisuals: (id: string) =>
    request<any>(`/api/projects/${id}/generate`, { method: 'POST' }),

  getGallery: (id: string) => request<any>(`/api/projects/${id}/gallery`),

  getContinuity: (id: string) => request<any>(`/api/projects/${id}/continuity`),

  getReviewQueue: (id: string) => request<any>(`/api/projects/${id}/review-queue`),

  getExportZipUrl: (id: string) => `${API_BASE}/api/projects/${id}/export`,
};
