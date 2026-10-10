import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddSpecialistForm } from '@/features/admin/specialists/components/add-specialist-form';

export default async function EditSpecialistPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: specialist, error } = await supabase
        .from('specialists')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !specialist) {
        console.error('Failed to fetch specialist:', { id, error, specialist });
        notFound();
    }

    return (
        <div className="mx-auto max-w-4xl p-6">
            <AddSpecialistForm initialData={specialist} />
        </div>
    );
}
