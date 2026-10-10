import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddBranchForm } from '@/features/admin/branches/components/add-branch-form';

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: branch, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !branch) {
        console.error('Failed to fetch branch:', { id, error, branch });
        notFound();
    }

    return (
        <div className="mx-auto max-w-4xl p-6">
            <AddBranchForm initialData={branch} />
        </div>
    );
}
