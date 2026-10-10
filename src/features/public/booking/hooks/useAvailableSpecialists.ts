"use client";

import { useState, useEffect } from 'react';
import { Specialist } from './useBookingFlow';

export function useAvailableSpecialists(serviceId?: string, branchId?: string) {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId || !branchId) {
      setSpecialists([]);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchSpecialists = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/specialists?service_id=${serviceId}&branch_id=${branchId}`,
          {
            cache: 'no-store',
          }
        );
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error ?? 'Failed to load specialists');
        }
        
        if (!isMounted) return;
        
        setSpecialists(result.data ?? []);
      } catch {
        if (!isMounted) return;

        const errorMessage = 'We could not load specialists for this branch right now.';
        setError(errorMessage);
        setSpecialists([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchSpecialists();
    
    return () => {
      isMounted = false;
    };
  }, [serviceId, branchId]);

  return {
    specialists,
    isLoading,
    error,
  };
}
