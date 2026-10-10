'use client';

import { useState, useEffect } from 'react';

export interface OptionItem {
  id: string;
  name: string;
}

interface ComplaintOptions {
  services: OptionItem[];
  branches: OptionItem[];
  loading: boolean;
}

export function useComplaintOptions(): ComplaintOptions {
  const [services, setServices] = useState<OptionItem[]>([]);
  const [branches, setBranches] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/complaints/options');
        if (!res.ok) return;
        const json = await res.json();
        setServices(json.services ?? []);
        setBranches(json.branches ?? []);
      } catch {
        // Non-fatal — form still works, just without dropdowns
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { services, branches, loading };
}
