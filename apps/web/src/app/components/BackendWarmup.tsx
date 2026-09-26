'use client';

import { useEffect } from 'react';

export function BackendWarmup() {
  useEffect(() => {
    const warmupBackend = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';
      try {
        await fetch(`${apiUrl}/api/health`, { method: 'GET' });
      } catch (error) {
        console.warn('Backend warmup failed:', error);
      }
    };

    warmupBackend();
  }, []);

  return null;
}
