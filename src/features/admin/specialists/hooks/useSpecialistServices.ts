'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Service } from '../types';

export function useSpecialistServices(specialistId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!specialistId) {
      setServices([]);
      return;
    }

    const fetchSpecialistServices = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        
        // Get services assigned to the specialist
        const { data, error } = await supabase
          .from('specialist_services')
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
          .eq('specialist_id', specialistId)
          .eq('is_active', true);

        if (error) throw error;

        const specialistServices = data
          ?.map(item => item.services)
          .filter(Boolean) as unknown as Service[];

        setServices(specialistServices || []);
      } catch (err: any) {
        console.error('Error fetching specialist services:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialistServices();
  }, [specialistId]);

  const updateSpecialistServices = async (serviceIds: string[]) => {
    if (!specialistId) return;

    try {
      const supabase = createClient();

      // First, deactivate all current services
      await supabase
        .from('specialist_services')
        .update({ is_active: false })
        .eq('specialist_id', specialistId);

      // Then, add/reactivate selected services
      if (serviceIds.length > 0) {
        const serviceAssignments = serviceIds.map(serviceId => ({
          specialist_id: specialistId,
          service_id: serviceId,
          is_active: true
        }));

        await supabase
          .from('specialist_services')
          .upsert(serviceAssignments, {
            onConflict: 'specialist_id,service_id'
          });
      }

      // Refetch services
      const { data, error } = await supabase
        .from('specialist_services')
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
        .eq('specialist_id', specialistId)
        .eq('is_active', true);

      if (error) throw error;

      const updatedServices = data
        ?.map(item => item.services)
        .filter(Boolean) as unknown as Service[];

      setServices(updatedServices || []);
      
      return { success: true };
    } catch (err: any) {
      console.error('Error updating specialist services:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return { services, loading, error, updateSpecialistServices };
}