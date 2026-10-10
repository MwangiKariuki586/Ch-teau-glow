'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { BlogCard } from './blog-card';
import type { BlogPost, BlogCategory } from '../types';

interface BlogListProps {
  initialPosts?: BlogPost[];
  initialCategories?: BlogCategory[];
}

export function BlogList({ initialPosts = [], initialCategories = [] }: BlogListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPosts = useMemo(() => {
    let filtered = initialPosts;

    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(post =>
        post.category_id === selectedCategory ||
        (post.blog_categories && (
          Array.isArray(post.blog_categories)
            ? post.blog_categories.some((c: BlogCategory) => c.id === selectedCategory)
            : (post.blog_categories as BlogCategory).id === selectedCategory
        ))
      );
    }

    return filtered;
  }, [initialPosts, searchTerm, selectedCategory]);

  const featuredPosts = filteredPosts.filter(post => post.is_featured);
  const regularPosts = filteredPosts.filter(post => !post.is_featured);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        {/* Search pill */}
        <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, topic, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="shrink-0 text-gray-400 hover:text-rose-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter button — outside the search pill */}
        {initialCategories.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-medium shadow-sm transition-colors ${
                selectedCategory
                  ? 'border-[#6B4423] bg-[#6B4423] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#6B4423] hover:text-[#6B4423]'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter{selectedCategory ? `: ${initialCategories.find(c => c.id === selectedCategory)?.name}` : ''}
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full z-10 mt-2 min-w-[200px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Filter by Category</span>
                  {selectedCategory && (
                    <button
                      onClick={() => { setSelectedCategory(''); setShowFilters(false); }}
                      className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      <X className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedCategory(''); setShowFilters(false); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedCategory === '' ? 'bg-[#6B4423]/10 font-medium text-[#6B4423]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {initialCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.id); setShowFilters(false); }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory === category.id ? 'bg-[#6B4423]/10 font-medium text-[#6B4423]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory ? 'No posts found matching your criteria.' : 'No blog posts available.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {featuredPosts.length > 0 && (
            <div>
              <h2 className="mb-6 text-3xl font-serif text-stone-900">Featured Posts</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {featuredPosts.map((post) => (
                  <BlogCard key={post.id} post={post} featured />
                ))}
              </div>
            </div>
          )}

          {regularPosts.length > 0 && (
            <div>
              {featuredPosts.length > 0 && (
                <h2 className="mb-6 text-3xl font-serif text-stone-900">Latest Posts</h2>
              )}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {regularPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
