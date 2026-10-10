import { createClient } from '@/lib/supabase/client';
import type { BlogPost, BlogCategory } from '../types';

export const publicBlogApi = {
  async getBlogPosts(categorySlug?: string) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (
            id,
            name,
            slug
          )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (categorySlug) {
        query = query.eq('blog_categories.slug', categorySlug);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Manually fetch user profiles for authors
      const postsWithAuthors = await Promise.all(
        data.map(async (post) => {
          const { data: authorProfile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('user_id', post.author_id)
            .maybeSingle();

          return {
            ...post,
            user_profiles: authorProfile || null,
          };
        })
      );

      return postsWithAuthors as BlogPost[];
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      throw error;
    }
  },

  async getBlogPost(slug: string) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (
            id,
            name,
            slug
          )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      // Manually fetch author profile
      const { data: authorProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', data.author_id)
        .maybeSingle();

      return {
        ...data,
        user_profiles: authorProfile || null,
      } as BlogPost;
    } catch (error) {
      console.error('Error fetching blog post:', error);
      throw error;
    }
  },

  async getFeaturedPosts(limit = 3) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (
            id,
            name,
            slug
          )
        `)
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Manually fetch user profiles for authors
      const postsWithAuthors = await Promise.all(
        data.map(async (post) => {
          const { data: authorProfile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('user_id', post.author_id)
            .maybeSingle();

          return {
            ...post,
            user_profiles: authorProfile || null,
          };
        })
      );

      return postsWithAuthors as BlogPost[];
    } catch (error) {
      console.error('Error fetching featured posts:', error);
      throw error;
    }
  },

  async getBlogCategories() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as BlogCategory[];
    } catch (error) {
      console.error('Error fetching blog categories:', error);
      throw error;
    }
  },

  async incrementViewCount(postId: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('increment_blog_view_count', {
        post_id: postId
      });

      if (error) console.error('Error incrementing view count:', error);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  },
  
  async getRelatedPosts(postId: string, categoryId: string, limit = 3) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (
            id,
            name,
            slug
          )
        `)
        .eq('status', 'published')
        .eq('category_id', categoryId)
        .neq('id', postId)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Manually fetch user profiles for authors
      const postsWithAuthors = await Promise.all(
        data.map(async (post) => {
          const { data: authorProfile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('user_id', post.author_id)
            .maybeSingle();

          return {
            ...post,
            user_profiles: authorProfile || null,
          };
        })
      );

      return postsWithAuthors as BlogPost[];
    } catch (error) {
      console.error('Error fetching related posts:', error);
      return [];
    }
  },
};