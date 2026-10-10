'use client';

import { useState, useEffect } from 'react';
import { faqApi, type FAQ } from '@/features/admin/faqs/api';
import { FAQList } from '@/features/admin/faqs/components/faq-list';
import { FAQForm } from '@/features/admin/faqs/components/faq-form';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);

  useEffect(() => {
    loadFAQs();
  }, []);

  async function loadFAQs() {
    try {
      setIsLoading(true);
      const data = await faqApi.getFAQs();
      setFaqs(data);
    } catch (error) {
      toast.error('Failed to load FAQs');
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreate = async (values: any) => {
    try {
      await faqApi.createFAQ(values);
      toast.success('FAQ created successfully');
      setView('list');
      loadFAQs();
    } catch (error) {
      toast.error('Failed to create FAQ');
    }
  };

  const handleUpdate = async (values: any) => {
    if (!selectedFAQ) return;
    try {
      await faqApi.updateFAQ(selectedFAQ.id, values);
      toast.success('FAQ updated successfully');
      setView('list');
      setSelectedFAQ(null);
      loadFAQs();
    } catch (error) {
      toast.error('Failed to update FAQ');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await faqApi.deleteFAQ(id);
      toast.success('FAQ deleted successfully');
      loadFAQs();
    } catch (error) {
      toast.error('Failed to delete FAQ');
    }
  };

  if (isLoading && view === 'list') {
    return <div className="p-8 text-center text-muted-foreground transition-all animate-pulse">Loading FAQs...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FAQ Management</h1>
          <p className="text-muted-foreground">Manage the frequently asked questions displayed on your landing page.</p>
        </div>
        {view === 'list' ? (
          <Button onClick={() => setView('create')}>
            <Plus className="mr-2 h-4 w-4" /> Add FAQ
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setView('list')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
          </Button>
        )}
      </div>

      {view === 'list' && (
        <FAQList 
          faqs={faqs} 
          onEdit={(faq) => {
            setSelectedFAQ(faq);
            setView('edit');
          }} 
          onDelete={handleDelete} 
        />
      )}

      {view === 'create' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Create New FAQ</h2>
          <FAQForm onSubmit={handleCreate} />
        </div>
      )}

      {view === 'edit' && selectedFAQ && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Edit FAQ</h2>
          <FAQForm initialData={selectedFAQ} onSubmit={handleUpdate} />
        </div>
      )}
    </div>
  );
}
