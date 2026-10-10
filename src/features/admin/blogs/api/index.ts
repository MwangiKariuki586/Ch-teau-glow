import { createClient } from '@/lib/supabase/client';
import type { BlogPost, BlogCategory, CreateBlogPostData, UpdateBlogPostData } from '../types';

export const blogApi = {
  // Blog Posts
  async getBlogPosts() {
    try {
      const supabase = createClient();
      
      // First check if user is authenticated and has admin role
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication failed');
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check user role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Failed to get user profile');
      }

      if (profile?.role !== 'admin') {
        throw new Error('Access denied: Admin role required');
      }

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Manually fetch user profiles for authors
      const postsWithAuthors = await Promise.all(
        data.map(async (post) => {
          const { data: authorProfile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('user_id', post.author_id)
            .single();

          return {
            ...post,
            user_profiles: authorProfile,
          };
        })
      );
      
      return postsWithAuthors as BlogPost[];
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      throw error;
    }
  },

  async getBlogPost(id: string) {
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
        .eq('id', id)
        .single();

      if (error) throw error;

      // Manually fetch author profile
      const { data: authorProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('user_id', data.author_id)
        .single();

      return {
        ...data,
        user_profiles: authorProfile,
      } as BlogPost;
    } catch (error) {
      console.error('Error fetching blog post:', error);
      throw error;
    }
  },

  async createBlogPost(postData: CreateBlogPostData) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          ...postData,
          author_id: user.id,
          published_at: postData.status === 'published' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BlogPost;
    } catch (error) {
      console.error('Error creating blog post:', error);
      throw error;
    }
  },

  async updateBlogPost(postData: UpdateBlogPostData) {
    try {
      const supabase = createClient();
      const { id, ...updateData } = postData;
      
      // Set published_at if status is being changed to published
      if (updateData.status === 'published') {
        const { data: currentPost } = await supabase
          .from('blog_posts')
          .select('published_at')
          .eq('id', id)
          .single();
        
        if (!currentPost?.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BlogPost;
    } catch (error) {
      console.error('Error updating blog post:', error);
      throw error;
    }
  },

  async deleteBlogPost(id: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting blog post:', error);
      throw error;
    }
  },

  // Blog Categories
  async getBlogCategories() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as BlogCategory[];
    } catch (error) {
      console.error('Error fetching blog categories:', error);
      throw error;
    }
  },

  async createBlogCategory(categoryData: Omit<BlogCategory, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;
      return data as BlogCategory;
    } catch (error) {
      console.error('Error creating blog category:', error);
      throw error;
    }
  },

  async updateBlogCategory(id: string, categoryData: Partial<BlogCategory>) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BlogCategory;
    } catch (error) {
      console.error('Error updating blog category:', error);
      throw error;
    }
  },

  async deleteBlogCategory(id: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('blog_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting blog category:', error);
      throw error;
    }
  },
};