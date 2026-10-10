'use client';

import { useState, useEffect } from 'react';
import { FileText, MessageSquare, Star, Plus, BookOpen, Eye, Edit, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { blogApi } from '@/features/admin/blogs/api';

const contentSections = [
  {
    title: 'Blog Management',
    description: 'Create and manage blog posts with rich text editor',
    icon: BookOpen,
    href: '/admin/blogs',
    color: 'bg-blue-500/10 text-blue-600',
    featured: true,
  },
  {
    title: 'FAQs',
    description: 'Frequently asked questions',
    icon: MessageSquare,
    href: '/admin/content/faqs',
    color: 'bg-green-500/10 text-green-600',
    comingSoon: true,
  },
  {
    title: 'Testimonials',
    description: 'Customer reviews and feedback',
    icon: Star,
    href: '/admin/content/testimonials',
    color: 'bg-yellow-500/10 text-yellow-600',
    comingSoon: true,
  },
];

export function ContentOverview() {
  const [blogStats, setBlogStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBlogStats = async () => {
      try {
        const posts = await blogApi.getBlogPosts();
        setBlogStats({
          totalPosts: posts.length,
          publishedPosts: posts.filter(p => p.status === 'published').length,
          draftPosts: posts.filter(p => p.status === 'draft').length,
        });
      } catch (error: any) {
        console.error('Error loading blog stats:', error);
        // Don't show error toast here as it's just for stats
        setBlogStats({
          totalPosts: 0,
          publishedPosts: 0,
          draftPosts: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadBlogStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Content Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manage website content, blog posts, and customer engagement materials
        </p>
      </div>

      {/* Blog Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{isLoading ? '...' : blogStats.totalPosts}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-green-600">{isLoading ? '...' : blogStats.publishedPosts}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-orange-600">{isLoading ? '...' : blogStats.draftPosts}</p>
              </div>
              <Edit className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Sections Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Content Sections</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {contentSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className={`group transition-all hover:shadow-lg ${section.featured ? 'ring-2 ring-primary/20' : ''}`}>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`rounded-lg p-3 ${section.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex gap-2">
                      {section.featured && (
                        <Badge variant="default" className="text-xs">
                          Featured
                        </Badge>
                      )}
                      {section.comingSoon && (
                        <Badge variant="secondary" className="text-xs">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                  
                  {section.comingSoon ? (
                    <Button variant="outline" disabled className="w-full">
                      Coming Soon
                    </Button>
                  ) : (
                    <Button asChild variant={section.featured ? 'default' : 'outline'} className="w-full group-hover:translate-x-1 transition-transform">
                      <Link href={section.href} className="flex items-center justify-center gap-2">
                        {section.featured ? 'Manage Blogs' : 'View'}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild className="justify-center gap-2">
              <Link href="/admin/blogs">
                <Plus className="h-4 w-4" />
                New Blog Post
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-center gap-2">
              <Link href="/admin/blogs">
                <BookOpen className="h-4 w-4" />
                View All Blogs
              </Link>
            </Button>
            <Button variant="outline" disabled className="justify-center gap-2">
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
            <Button variant="outline" disabled className="justify-center gap-2">
              <Plus className="h-4 w-4" />
              Add Testimonial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
