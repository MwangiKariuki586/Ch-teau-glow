'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface CategoryOption {
  id: string;
  name: string;
}

export function useAdminSupabase() {
  const supabase = useMemo(() => createClient(), []);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const validateAccess = async () => {
      setLoadingAccess(true);
      setAccessError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setIsAdmin(false);
        setUserId(null);
        setAccessError('Please sign in as an admin to manage catalog data.');
        setLoadingAccess(false);
        return;
      }

      const { data: role, error: roleError } = await supabase.rpc('get_user_role');

      if (!isMounted) return;

      if (roleError) {
        setIsAdmin(false);
        setUserId(null);
        setAccessError(roleError.message);
        setLoadingAccess(false);
        return;
      }

      const hasAdminRole = role === 'admin';
      setIsAdmin(hasAdminRole);
      setUserId(hasAdminRole ? user.id : null);
      setAccessError(hasAdminRole ? null : 'You do not have admin permissions for this action.');
      setLoadingAccess(false);
    };

    void validateAccess();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return {
    supabase,
    loadingAccess,
    isAdmin,
    userId,
    accessError,
  };
}
