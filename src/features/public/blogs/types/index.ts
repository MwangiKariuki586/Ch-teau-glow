export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content_html?: string;
  featured_image_url?: string;
  category_id?: string;
  status: 'published';
  is_featured: boolean;
  published_at: string;
  meta_title?: string;
  meta_description?: string;
  tags: string[];
  read_time_minutes?: number;
  view_count: number;
  created_at: string;
  // Relations
  blog_categories?: BlogCategory;
  user_profiles?: {
    first_name?: string;
    last_name?: string;
  };
}