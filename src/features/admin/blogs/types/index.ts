export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: any; // TipTap JSON content
  content_html?: string;
  featured_image_url?: string;
  category_id?: string;
  author_id: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  published_at?: string;
  meta_title?: string;
  meta_description?: string;
  tags: string[];
  read_time_minutes?: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  blog_categories?: BlogCategory;
  user_profiles?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export interface BlogComment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostData {
  title: string;
  slug: string;
  excerpt?: string;
  content: any;
  content_html?: string;
  featured_image_url?: string;
  category_id?: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  published_at?: string | null;
  meta_title?: string;
  meta_description?: string;
  tags: string[];
}

export interface UpdateBlogPostData extends Partial<CreateBlogPostData> {
  id: string;
}