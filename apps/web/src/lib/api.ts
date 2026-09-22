import { Kit } from '@rehearsa/shared';

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
