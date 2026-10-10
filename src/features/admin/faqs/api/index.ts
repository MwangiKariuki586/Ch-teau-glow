import { createClient } from '@/lib/supabase/client';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const faqApi = {
  async getFAQs() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as FAQ[];
  },

  async createFAQ(faq: Omit<FAQ, 'id' | 'created_at'>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('faqs')
      .insert(faq)
      .select()
      .single();

    if (error) throw error;
    return data as FAQ;
  },

  async updateFAQ(id: string, faq: Partial<Omit<FAQ, 'id' | 'created_at'>>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('faqs')
      .update(faq)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FAQ;
  },

  async deleteFAQ(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
