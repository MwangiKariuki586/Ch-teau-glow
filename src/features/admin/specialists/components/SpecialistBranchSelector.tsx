'use client';

import { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import type { Branch } from '../types';

interface SpecialistBranchSelectorProps {
  selectedBranchId?: string;
  onBranchChange: (branchId: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function SpecialistBranchSelector({
  selectedBranchId,
  onBranchChange,
  required = false,
  disabled = false
}: SpecialistBranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('branches')
          .select('id, name, city, country, is_active')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setBranches((data as Branch[]) || []);
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="branch-select" className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        Branch Assignment {required && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={selectedBranchId}
        onValueChange={onBranchChange}
        disabled={disabled || loading}
      >
        <SelectTrigger id="branch-select">
          <SelectValue placeholder={loading ? "Loading branches..." : "Select a branch"} />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{branch.name}</span>
                <span className="text-sm text-muted-foreground">
                  {branch.city}, {branch.country}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {required && !selectedBranchId && (
        <p className="text-sm text-muted-foreground">
          Each specialist must be assigned to exactly one branch
        </p>
      )}
    </div>
  );
}