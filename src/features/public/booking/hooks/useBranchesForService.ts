"use client";

import { useState, useEffect } from 'react';
import { Branch } from './useBookingFlow';

export function useBranchesForService(serviceId?: string) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      setBranches([]);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchBranches = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/branches?service_id=${serviceId}`, {
          cache: 'no-store',
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error ?? 'Failed to load branches');
        }
        
        if (!isMounted) return;
        
        setBranches(result.data ?? []);
      } catch {
        if (!isMounted) return;

        const errorMessage = 'We could not load available branches right now.';
        setError(errorMessage);
        setBranches([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchBranches();
    
    return () => {
      isMounted = false;
    };
  }, [serviceId]);

  return {
    branches,
    isLoading,
    error,
  };
}
