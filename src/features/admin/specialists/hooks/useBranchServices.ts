'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Service } from '../types';

export function useBranchServices(branchId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranchServices = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        if (branchId) {
          // Get services offered at the selected branch via service_branches junction table
          const { data, error } = await supabase
            .from('service_branches')
            .select(`
              service_id,
              is_active,
              services (
                id,
                name,
                slug,
                description,
                min_price_cents,
                max_price_cents,
                currency,
                duration_minutes,
                cover_image_url,
                status,
                is_featured,
                created_at,
                updated_at
              )
            `)
            .eq('branch_id', branchId)
            .eq('is_active', true)
            .eq('services.status', 'published');

          if (error) throw error;

          const branchServices = data
            ?.map(item => item.services)
            .filter(Boolean) as unknown as Service[];

          setServices(branchServices || []);
        } else {
          // No branch filter — return all published services (many-to-many: all services available everywhere)
          const { data, error } = await supabase
            .from('services')
            .select(`
              id, name, slug, description,
              min_price_cents, max_price_cents, currency,
              duration_minutes, cover_image_url, status,
              is_featured, created_at, updated_at
            `)
            .eq('status', 'published')
            .order('name', { ascending: true });

          if (error) throw error;
          setServices((data ?? []) as unknown as Service[]);
        }
      } catch (err: any) {
        console.error('Error fetching services:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBranchServices();
  }, [branchId]);

  return { services, loading, error };
}