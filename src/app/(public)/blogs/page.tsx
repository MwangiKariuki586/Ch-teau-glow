import { BlogList } from '@/features/public/blogs';
import { createClient } from '@/lib/supabase/server';
import type { BlogPost, BlogCategory } from '@/features/public/blogs/types';

const DEMO_POSTS: BlogPost[] = [
  {
    id: 'demo-1',
    title: 'The Ultimate Guide to Microblading: What to Expect',
    slug: 'demo-microblading-guide',
    excerpt: 'Thinking about microblading? We break down everything from the consultation to aftercare so you know exactly what to expect.',
    featured_image_url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-04-01T10:00:00Z',
    created_at: '2026-04-01T10:00:00Z',
    tags: ['Brows', 'Microblading', 'Semi-Permanent'],
    read_time_minutes: 5,
    view_count: 1240,
    blog_categories: { id: 'c1', name: 'Brows', slug: 'brows', sort_order: 1, is_active: true },
  },
  {
    id: 'demo-2',
    title: 'Top 5 Skincare Ingredients You Should Know About',
    slug: 'demo-skincare-ingredients',
    excerpt: 'From retinol to niacinamide, our dermatologists explain the powerhouse ingredients that actually make a difference.',
    featured_image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-03-28T10:00:00Z',
    created_at: '2026-03-28T10:00:00Z',
    tags: ['Skincare', 'Ingredients', 'Dermatology'],
    read_time_minutes: 7,
    view_count: 980,
    blog_categories: { id: 'c2', name: 'Skincare', slug: 'skincare', sort_order: 2, is_active: true },
  },
  {
    id: 'demo-3',
    title: 'Laser Hair Removal: Myths vs. Facts',
    slug: 'demo-laser-myths',
    excerpt: 'There is a lot of misinformation out there about laser treatments. Our specialists set the record straight.',
    featured_image_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-03-20T10:00:00Z',
    created_at: '2026-03-20T10:00:00Z',
    tags: ['Laser', 'Hair Removal', 'Myths'],
    read_time_minutes: 6,
    view_count: 2100,
    blog_categories: { id: 'c3', name: 'Laser', slug: 'laser', sort_order: 3, is_active: true },
  },
  {
    id: 'demo-4',
    title: 'How to Prepare for Your First Facial at Château Glow',
    slug: 'demo-first-facial',
    excerpt: 'First-time facial? Here is our step-by-step guide to getting the most out of your Château Glow experience.',
    featured_image_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-03-15T10:00:00Z',
    created_at: '2026-03-15T10:00:00Z',
    tags: ['Facials', 'Beginners', 'Tips'],
    read_time_minutes: 4,
    view_count: 760,
    blog_categories: { id: 'c4', name: 'Facials', slug: 'facials', sort_order: 4, is_active: true },
  },
  {
    id: 'demo-5',
    title: 'Lip Blush: The Natural-Looking Lip Enhancement Trend',
    slug: 'demo-lip-blush',
    excerpt: 'Lip blush is taking over the beauty world. Find out why clients love this semi-permanent treatment.',
    featured_image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-03-10T10:00:00Z',
    created_at: '2026-03-10T10:00:00Z',
    tags: ['Lips', 'Semi-Permanent', 'Trends'],
    read_time_minutes: 5,
    view_count: 1580,
    blog_categories: { id: 'c1', name: 'Brows', slug: 'brows', sort_order: 1, is_active: true },
  },
  {
    id: 'demo-6',
    title: 'Understanding Skin Types: A Complete Breakdown',
    slug: 'demo-skin-types',
    excerpt: 'Oily, dry, combination, sensitive — knowing your skin type is the foundation of any great skincare routine.',
    featured_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-03-05T10:00:00Z',
    created_at: '2026-03-05T10:00:00Z',
    tags: ['Skincare', 'Skin Types', 'Education'],
    read_time_minutes: 8,
    view_count: 3200,
    blog_categories: { id: 'c2', name: 'Skincare', slug: 'skincare', sort_order: 2, is_active: true },
  },
  {
    id: 'demo-7',
    title: 'The Science Behind PRP Treatments',
    slug: 'demo-prp-science',
    excerpt: 'Platelet-rich plasma therapy is one of the most talked-about treatments in aesthetics. Here is the science.',
    featured_image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-02-28T10:00:00Z',
    created_at: '2026-02-28T10:00:00Z',
    tags: ['PRP', 'Medical Aesthetics', 'Science'],
    read_time_minutes: 9,
    view_count: 890,
    blog_categories: { id: 'c3', name: 'Laser', slug: 'laser', sort_order: 3, is_active: true },
  },
  {
    id: 'demo-8',
    title: 'Post-Treatment Care: Do\'s and Don\'ts',
    slug: 'demo-post-treatment-care',
    excerpt: 'Getting the most from your treatment does not stop when you leave the clinic. Follow these aftercare tips.',
    featured_image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80',
    status: 'published',
    is_featured: false,
    published_at: '2026-02-20T10:00:00Z',
    created_at: '2026-02-20T10:00:00Z',
    tags: ['Aftercare', 'Tips', 'Recovery'],
    read_time_minutes: 5,
    view_count: 1450,
    blog_categories: { id: 'c4', name: 'Facials', slug: 'facials', sort_order: 4, is_active: true },
  },
];

export default async function BlogsPage() {
  let posts: BlogPost[] = [];
  let categories: BlogCategory[] = [];

  try {
    const supabase = await createClient();
    const [postsResult, categoriesResult] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('*, blog_categories(id, name, slug, sort_order, is_active)')
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
      supabase
        .from('blog_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);
    posts = (postsResult.data ?? []) as BlogPost[];
    categories = (categoriesResult.data ?? []) as BlogCategory[];
  } catch {
    // fall through to demo data
  }

  // Merge real posts with demo posts to always have content to display
  const finalPosts = [...posts, ...DEMO_POSTS.filter(d => !posts.find(p => p.id === d.id))];
  const finalPosts2 = finalPosts.length > 0 ? finalPosts : DEMO_POSTS;

  console.log('[BlogsPage] posts from DB:', posts.length, '| finalPosts2:', finalPosts2.length);

  // Always use demo categories for the filter UI
  const DEMO_CATEGORIES: BlogCategory[] = [
    { id: 'c1', name: 'Brows', slug: 'brows', sort_order: 1, is_active: true },
    { id: 'c2', name: 'Skincare', slug: 'skincare', sort_order: 2, is_active: true },
    { id: 'c3', name: 'Laser', slug: 'laser', sort_order: 3, is_active: true },
    { id: 'c4', name: 'Facials', slug: 'facials', sort_order: 4, is_active: true },
  ];
  const finalCategories = categories.length > 0 ? categories : DEMO_CATEGORIES;

  return (
    <main className="min-h-screen bg-[#F9F5F0] pt-20">
      {/* Header Section */}
      <section className="py-12 bg-[#F9F5F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest mb-4">
              Beauty & Wellness Insights
            </span>
            <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4">
              The Château Glow Journal
            </h1>
            <p className="text-stone-500 max-w-2xl mx-auto font-light text-lg">
              Expert tips, treatment guides, and beauty inspiration from our specialists.
            </p>
          </div>
        </div>
      </section>

      {/* Blog List Section */}
      <section className="py-8 bg-[#F9F5F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <BlogList initialPosts={finalPosts2} initialCategories={finalCategories} />
        </div>
      </section>
    </main>
  );
}
