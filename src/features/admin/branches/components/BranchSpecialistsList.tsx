'use client';

import { Users, Edit, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBranchSpecialists } from '../hooks/useBranchSpecialists';
import type { Specialist } from '../../specialists/types';

interface BranchSpecialistsListProps {
  branchId: string;
  branchName: string;
}

export function BranchSpecialistsList({ branchId, branchName }: BranchSpecialistsListProps) {
  const { specialists, loading, error } = useBranchSpecialists(branchId);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Assigned Specialists</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-muted-foreground">Loading specialists...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Assigned Specialists</h3>
        </div>
        <div className="text-center py-8 text-destructive">
          <p>Error loading specialists: {error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Assigned Specialists</h3>
          <Badge variant="outline">{specialists.length}</Badge>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/specialists/new">
            <Plus className="h-4 w-4 mr-1" />
            Add Specialist
          </Link>
        </Button>
      </div>

      {specialists.length === 0 ? (
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h4 className="text-lg font-medium text-muted-foreground mb-2">
            No specialists assigned
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            This branch doesn't have any specialists assigned yet.
          </p>
          <Button asChild>
            <Link href="/admin/specialists/new">
              <Plus className="h-4 w-4 mr-1" />
              Add First Specialist
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {specialists.map((specialist) => (
            <div
              key={specialist.id}
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {specialist.image_url ? (
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={specialist.image_url}
                    alt={specialist.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{specialist.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{specialist.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={specialist.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {specialist.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {specialist.specialties && specialist.specialties.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {specialist.specialties.length} specialties
                    </Badge>
                  )}
                </div>
              </div>

              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/specialists/${specialist.id}`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}