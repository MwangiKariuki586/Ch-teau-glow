'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteBranch } from '../api';

interface DeleteBranchButtonProps {
  branchId: string;
  branchName: string;
  /** When true, renders a full-width destructive button (used on detail page) */
  variant?: 'icon' | 'full';
  onDeleted?: () => void;
}

export function DeleteBranchButton({
  branchId,
  branchName,
  variant = 'icon',
  onDeleted,
}: DeleteBranchButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteBranch(branchId);
    setLoading(false);

    if (result.error) {
      toast.error('Cannot delete branch', { description: result.error });
      return;
    }

    toast.success(`"${branchName}" has been deleted.`);
    if (onDeleted) {
      onDeleted();
    } else {
      router.push('/admin/branches');
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="destructive" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Branch
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{branchName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the branch and all associated data
            (services, inventory, analytics, waitlist entries). This action
            cannot be undone.
            <br />
            <br />
            Branches with active or pending bookings cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting…' : 'Delete Branch'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
