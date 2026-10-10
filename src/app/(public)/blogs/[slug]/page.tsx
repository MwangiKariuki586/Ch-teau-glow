import { notFound } from 'next/navigation';
import { BlogDetail } from '@/features/public/blogs';
import { publicBlogApi } from '@/features/public/blogs/api';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  
  try {
    const post = await publicBlogApi.getBlogPost(slug);
    
    // Fetch related posts from the same category
    const relatedPosts = post.category_id 
      ? await publicBlogApi.getRelatedPosts(post.id, post.category_id, 3)
      : [];
    
    return (
      <div className="container mx-auto px-4 py-8">
        <BlogDetail post={post} relatedPosts={relatedPosts} />
      </div>
    );
  } catch (error) {
    console.error('Error in BlogPostPage:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  
  try {
    const post = await publicBlogApi.getBlogPost(slug);
    
    return {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      openGraph: {
        title: post.meta_title || post.title,
        description: post.meta_description || post.excerpt,
        images: post.featured_image_url ? [post.featured_image_url] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
    };
  }
}