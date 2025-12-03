'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Custom hook for making tenant-aware API calls
 * Automatically appends tenantId from URL parameters to API requests
 */
export function useTenantAwareFetch() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');

  const tenantFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      // Append tenantId to URL if it exists
      if (tenantId) {
        const urlObj = new URL(url, window.location.origin);
        urlObj.searchParams.set('tenantId', tenantId);
        url = urlObj.toString();
      }

      return fetch(url, options);
    },
    [tenantId]
  );

  return { tenantFetch, tenantId };
}
