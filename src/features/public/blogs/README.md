# Blogs Page Feature

This feature contains all components for the Blogs page of the BROWZ beauty and aesthetics marketplace.

## Structure

```
blogs/
├── components/
│   ├── hero-section.tsx           # Hero with search and filters
│   ├── featured-post.tsx          # Featured article card
│   ├── blog-grid.tsx              # Blog posts grid
│   ├── newsletter-section.tsx     # Newsletter subscription
│   └── index.ts                   # Component exports
├── index.ts                       # Feature exports
└── README.md                      # This file
```

## Components

### HeroSection
- Full-width background image
- Page title and description
- Search bar with icon
- Category filter buttons (All, Skincare, Makeup, Treatments, Wellness, Tips & Tricks)
- State management for search and filters
- Responsive design

**Props:**
- `searchQuery: string` - Current search query
- `setSearchQuery: (query: string) => void` - Update search query
- `selectedCategory: string` - Current selected category
- `setSelectedCategory: (category: string) => void` - Update category

### FeaturedPost
- Large featured article card
- Split layout (image + content)
- Category badge
- Author, date, and read time metadata
- Hover effects
- Link to full article

**Data:**
- Title, excerpt, image
- Category, author, date, read time
- Slug for routing

### BlogGrid
- Grid of blog post cards (3 columns on desktop)
- Filtering by category and search query
- Each card includes:
  - Featured image with hover scale
  - Category badge
  - Title (2-line clamp)
  - Excerpt (3-line clamp)
  - Author and date
  - Read time
  - "Read More" link with arrow
- Empty state when no results

**Props:**
- `searchQuery: string` - Filter by search query
- `selectedCategory: string` - Filter by category

**Data:**
- 9 blog posts with full metadata
- Categories: Skincare, Makeup, Treatments, Wellness, Tips & Tricks

### NewsletterSection
- Newsletter subscription CTA
- Email input field
- Subscribe button
- Gradient background
- Centered layout

## Features

### Search Functionality
- Real-time search filtering
- Searches in title and excerpt
- Case-insensitive matching
- Updates grid instantly

### Category Filtering
- 6 categories + "All"
- Active state styling
- Combines with search
- Instant filtering

### Blog Post Data
Each post includes:
- Title
- Excerpt
- Image URL
- Category
- Author name
- Publication date
- Read time estimate
- Slug for routing

### Responsive Design
- Desktop: 3-column grid
- Tablet: 2-column grid
- Mobile: Single column
- Responsive search bar
- Flexible category buttons

## Styling

All components use:
- Shadcn UI components (Card, Button, Input, Badge)
- Tailwind CSS utility classes
- Brand colors:
  - Primary: `#6B4423` (brown)
  - Accent: `#c9a961` (gold)
  - Backgrounds: white, gray-50

## Icons

Using Lucide React icons:
- Search - Search bar
- Calendar - Publication date
- Clock - Read time
- User - Author
- ArrowRight - Read more links

## Usage

```tsx
'use client';

import { useState } from 'react';
import { Navbar } from '@/features/navigation';
import {
  HeroSection,
  FeaturedPost,
  BlogGrid,
  NewsletterSection,
} from '@/features/blogs';

export default function BlogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <>
      <Navbar />
      <main>
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <FeaturedPost />
        <BlogGrid 
          searchQuery={searchQuery} 
          selectedCategory={selectedCategory} 
        />
        <NewsletterSection />
      </main>
    </>
  );
}
```

## State Management

The page uses React useState for:
- `searchQuery` - Current search input
- `selectedCategory` - Active category filter

State is passed down to components via props for filtering.

## Filtering Logic

```typescript
const filteredPosts = blogPosts.filter(post => {
  const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
  const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
  return matchesCategory && matchesSearch;
});
```

## Blog Post Structure

```typescript
interface BlogPost {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  slug: string;
}
```

## Images

All images use:
- Unsplash URLs (configured in next.config.ts)
- Proper alt text
- Hover scale effects
- Object-cover for consistent sizing

## Animations

- Image scale on hover
- Button gap increase on hover
- Smooth transitions
- Shadow elevations
- Category button states

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Alt text on images
- Keyboard navigation
- Focus states on interactive elements
- ARIA labels where needed

## Future Enhancements

- Add pagination or infinite scroll
- Implement actual blog post pages
- Connect to CMS or database
- Add social sharing buttons
- Include related posts
- Add author profiles
- Implement comments system
- Add reading progress indicator
- Include table of contents
- Add bookmark functionality
- Implement newsletter integration with Supabase
- Add blog post analytics

## Newsletter Integration

Currently static. To integrate with Supabase:

```typescript
import { createClient } from '@/lib/supabase/client';

const handleSubscribe = async (email: string) => {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('newsletter_subscriptions')
    .insert({ email, source: 'blog' });
    
  if (error) {
    // Handle error
  } else {
    // Show success message
  }
};
```

## SEO Considerations

For production:
- Add metadata to each blog post
- Implement dynamic meta tags
- Add structured data (JSON-LD)
- Create XML sitemap
- Implement canonical URLs
- Add Open Graph tags
- Include Twitter Card tags
