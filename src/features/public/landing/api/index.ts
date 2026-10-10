import { createClient } from '@/lib/supabase/client';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export const landingApi = {
  async getFAQs(limit = 5) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as FAQ[];
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  }
};
