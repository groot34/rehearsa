import { Kit, RegenerateSection } from '@rehearsa/shared';

export interface GenerateKitPayload {
  jobDescription: string;
  companyUrl: string;
  daysAvailable: number;
}

export interface ApiGenerateResponse {
  success: boolean;
  kit?: Kit;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Sends a request to the backend API to generate an interview preparation kit.
 */
export async function generateInterviewKit(
  payload: GenerateKitPayload
): Promise<ApiGenerateResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const endpoint = `${apiUrl}/api/interview-prep/generate`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || {
          code: 'HTTP_ERROR',
          message: `API request failed with status ${res.status}: ${res.statusText}`,
        },
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to connect to Rehearsa API server. Make sure the backend server is running.',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Section regeneration
// ---------------------------------------------------------------------------

// Re-export from shared so consumers of this module get the canonical type.
export type { RegenerateSection };

export interface RegenerateKitSectionPayload {
  kit: Kit;
  section: RegenerateSection;
  /** IDs of items the user has edited in-place (original LLM-generated IDs). */
  preserved_ids: string[];
}

export interface ApiRegenerateResponse {
  success: boolean;
  kit?: Kit;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Sends a request to regenerate a single kit section while preserving
 * manually edited and user-added items.
 *
 * On success the caller should replace its local kit state with the returned
 * kit.  On failure the caller should retain the existing kit unchanged.
 *
 * Note: preserved_ids tracking is a best-effort client-side mechanism. It is
 * lost on browser refresh because there is no persistence layer.
 */
export async function regenerateKitSection(
  payload: RegenerateKitSectionPayload
): Promise<ApiRegenerateResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const endpoint = `${apiUrl}/api/interview-prep/regenerate-section`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || {
          code: 'HTTP_ERROR',
          message: `Regeneration request failed with status ${res.status}: ${res.statusText}`,
        },
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to connect to Rehearsa API server.',
      },
    };
  }
}
