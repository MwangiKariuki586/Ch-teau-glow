'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Specialist } from '../types';

export function useSpecialists() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecialists = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Fetch specialists with their branch information
      const { data, error } = await supabase
        .from('specialists')
        .select(`
          id,
          branch_id,
          name,
          title,
          bio,
          email,
          phone,
          image_url,
          specialties,
          availability,
          is_active,
          created_at,
          updated_at,
          branches (
            id,
            name,
            city,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const specialistsWithBranch = data?.map(specialist => ({
        ...specialist,
        branch: specialist.branches
      })) as unknown as Specialist[];

      setSpecialists(specialistsWithBranch || []);
    } catch (err: any) {
      console.error('Error fetching specialists:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialists();
  }, []);

  const refetch = () => {
    fetchSpecialists();
  };

  return { specialists, loading, error, refetch };
}