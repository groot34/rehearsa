import { Kit, RegenerateSection, KitSummary } from '@rehearsa/shared';

// ---------------------------------------------------------------------------
// Kit generation
// ---------------------------------------------------------------------------

export interface GenerateKitPayload {
  jobDescription: string;
  companyUrl: string;
  daysAvailable: number;
}

export interface ApiGenerateResponse {
  success: boolean;
  kit?: Kit;
  error?: { code: string; message: string; details?: any };
}

export async function generateInterviewKit(
  payload: GenerateKitPayload
): Promise<ApiGenerateResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const endpoint = `${apiUrl}/api/interview-prep/generate`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || { code: 'HTTP_ERROR', message: `API request failed with status ${res.status}` },
      };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message || 'Failed to connect to Rehearsa API server.' } };
  }
}

// ---------------------------------------------------------------------------
// Section regeneration
// ---------------------------------------------------------------------------

export type { RegenerateSection };

export interface RegenerateKitSectionPayload {
  kit: Kit;
  section: RegenerateSection;
  preserved_ids: string[];
}

export interface ApiRegenerateResponse {
  success: boolean;
  kit?: Kit;
  error?: { code: string; message: string; details?: any };
}

export async function regenerateKitSection(
  payload: RegenerateKitSectionPayload
): Promise<ApiRegenerateResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const endpoint = `${apiUrl}/api/interview-prep/regenerate-section`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || { code: 'HTTP_ERROR', message: `Regeneration request failed with status ${res.status}` },
      };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message || 'Failed to connect to Rehearsa API server.' } };
  }
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface AuthPayload { email: string; password: string; }

export interface AuthUser { id: string; email: string; createdAt: string; }

export interface ApiAuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: { code: string; message: string; details?: any };
}

function authHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function registerUser(payload: AuthPayload): Promise<ApiAuthResponse> {
  try {
    const res = await fetch('/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return data;
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

export async function loginUser(payload: AuthPayload): Promise<ApiAuthResponse> {
  try {
    const res = await fetch('/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return data;
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

export async function logoutUser(token: string): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST', headers: authHeaders(token) });
  } catch {
    // Best-effort logout — client discards token regardless
  }
}

// ---------------------------------------------------------------------------
// Kit persistence (Milestone 9)
// ---------------------------------------------------------------------------

export interface SavedKitMeta { id: string; kit: Kit; createdAt: string; updatedAt: string; }

export interface ApiKitResponse {
  success: boolean;
  data?: SavedKitMeta;
  error?: { code: string; message: string };
}

export interface ApiKitListResponse {
  success: boolean;
  kits?: KitSummary[];
  error?: { code: string; message: string };
}

export async function saveKitToServer(kit: Kit, token: string): Promise<ApiKitResponse> {
  try {
    const res = await fetch('/api/kits', {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify({ kit }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, data: { id: data.id, kit: data.kit, createdAt: data.createdAt, updatedAt: data.updatedAt } };
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

export async function fetchKitList(token: string): Promise<ApiKitListResponse> {
  try {
    const res = await fetch('/api/kits', { headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, kits: data.kits };
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

export async function fetchKitById(id: string, token: string): Promise<ApiKitResponse> {
  try {
    const res = await fetch(`/api/kits/${id}`, { headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, data: { id: data.id, kit: data.kit, createdAt: data.createdAt, updatedAt: data.updatedAt } };
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

export async function updateKitOnServer(id: string, kit: Kit, token: string): Promise<ApiKitResponse> {
  try {
    const res = await fetch(`/api/kits/${id}`, {
      method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ kit }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, data: { id: data.id, kit: data.kit, createdAt: data.createdAt, updatedAt: data.updatedAt } };
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

export async function deleteKitFromServer(
  id: string,
  token: string
): Promise<{ success: boolean; error?: { code: string; message: string } }> {
  try {
    const res = await fetch(`/api/kits/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}
