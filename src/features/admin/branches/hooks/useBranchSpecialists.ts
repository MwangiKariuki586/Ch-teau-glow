'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Specialist } from '../../specialists/types';

export function useBranchSpecialists(branchId?: string) {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) {
      setSpecialists([]);
      return;
    }

    const fetchBranchSpecialists = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        
        // Get specialists assigned to the branch
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
            updated_at
          `)
          .eq('branch_id', branchId)
          .order('name');

        if (error) throw error;

        setSpecialists(data || []);
      } catch (err: any) {
        console.error('Error fetching branch specialists:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBranchSpecialists();
  }, [branchId]);

  return { specialists, loading, error };
}