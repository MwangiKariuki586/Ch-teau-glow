'use client';

import { ArrowLeft, MapPin, Phone, Mail, Building2, Edit } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BranchSpecialistsList } from './BranchSpecialistsList';
import { DeleteBranchButton } from './delete-branch-button';
import type { Branch } from '../../specialists/types';

interface BranchDetailsProps {
  branch: Branch;
}

export function BranchDetails({ branch }: BranchDetailsProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/branches">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {branch.name}
            </h1>
            <Badge variant={branch.is_active ? 'default' : 'secondary'}>
              {branch.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Branch location details and assigned specialists
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/branches/${branch.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Branch
          </Link>
        </Button>
        <DeleteBranchButton branchId={branch.id} branchName={branch.name} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branch Information */}
        <div className="space-y-6">
          {/* Image */}
          {branch.image_url && (
            <Card className="overflow-hidden">
              <div className="relative aspect-video">
                <Image
                  src={branch.image_url}
                  alt={branch.name}
                  fill
                  className="object-cover"
                />
              </div>
            </Card>
          )}

          {/* Details */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <Building2 className="h-5 w-5 text-primary" />
              Branch Information
            </h2>
            
            <div className="space-y-4">
              {branch.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                  <p className="text-sm">{branch.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Address</h3>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p>{branch.address}</p>
                    <p>
                      {branch.city}
                      {branch.state && `, ${branch.state}`}
                      {branch.postal_code && ` ${branch.postal_code}`}
                    </p>
                    <p>{branch.country}</p>
                  </div>
                </div>
              </div>

              {(branch.phone || branch.email) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{branch.email}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Created: {new Date(branch.created_at).toLocaleDateString()}</span>
                  <span>Updated: {new Date(branch.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Specialists */}
        <div>
          <BranchSpecialistsList branchId={branch.id} branchName={branch.name} />
        </div>
      </div>
    </div>
  );
}