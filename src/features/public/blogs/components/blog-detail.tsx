"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Eye,
  Link as LinkIcon,
  Twitter,
  Facebook,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { publicBlogApi } from "../api";
import type { BlogPost } from "../types";
import { BlogCard } from "./blog-card";
import { toast } from "sonner";

interface BlogDetailProps {
  post: BlogPost;
  relatedPosts?: BlogPost[];
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export function BlogDetail({ post, relatedPosts = [] }: BlogDetailProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    publicBlogApi.incrementViewCount(post.id);
  }, [post.id]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post.title);
    window.open(
      `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      "_blank",
    );
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
    );
  };

  return (
    <article className="max-w-3xl mx-auto px-4 pb-24">
      {/* Back link */}
      <div className="pt-8 mb-10">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All articles
        </Link>
      </div>

      {/* Header */}
      <header className="mb-10">
        {/* Category badge */}
        {post.blog_categories && (
          <div className="mb-4">
            <Badge
              variant="outline"
              className="rounded-full text-xs font-medium px-3 py-0.5 border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
            >
              {post.blog_categories.name}
            </Badge>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-[2.6rem] font-semibold tracking-tight leading-[1.2] mb-5 text-foreground">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            {post.excerpt}
          </p>
        )}

        {/* Author + meta row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {post.user_profiles && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {getInitials(
                  post.user_profiles.first_name,
                  post.user_profiles.last_name,
                )}
              </div>
              <span className="text-sm font-medium text-foreground">
                {post.user_profiles.first_name} {post.user_profiles.last_name}
              </span>
            </div>
          )}

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(post.published_at), "MMM d, yyyy")}
            </div>

            {post.read_time_minutes && (
              <>
                <span className="text-border">·</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {post.read_time_minutes} min read
                </div>
              </>
            )}

            <span className="text-border">·</span>
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {post.view_count.toLocaleString()} views
            </div>
          </div>
        </div>
      </header>

      {/* Featured image */}
      {post.featured_image_url && (
        <div className="mb-12 rounded-xl overflow-hidden aspect-video">
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article body */}
      <div
        className="
          prose prose-base dark:prose-invert max-w-none mb-14
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-p:text-base prose-p:leading-[1.85] prose-p:text-foreground/90
          prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-2 prose-blockquote:border-purple-300 prose-blockquote:not-italic prose-blockquote:text-muted-foreground prose-blockquote:pl-4
          prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-muted prose-pre:rounded-xl prose-pre:border prose-pre:border-border
          prose-img:rounded-xl prose-img:border prose-img:border-border
          prose-hr:border-border
        "
      >
        {post.content_html ? (
          <div dangerouslySetInnerHTML={{ __html: post.content_html }} />
        ) : (
          <p className="text-muted-foreground italic text-center py-16 border border-dashed rounded-xl">
            No content available for this post.
          </p>
        )}
      </div>

      {/* Tags + mobile share */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-8 border-t border-border">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Mobile share buttons */}
        <div className="flex items-center gap-2 lg:hidden">
          <span className="text-xs text-muted-foreground mr-1">Share</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full border border-border"
            onClick={copyToClipboard}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full border border-border"
            onClick={shareOnTwitter}
          >
            <Twitter className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full border border-border"
            onClick={shareOnFacebook}
          >
            <Facebook className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Author card */}
      {post.user_profiles && (
        <div className="mt-12 p-6 rounded-xl border border-border bg-muted/30 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-sm font-semibold flex items-center justify-center flex-shrink-0">
            {getInitials(
              post.user_profiles.first_name,
              post.user_profiles.last_name,
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">
              {post.user_profiles.first_name} {post.user_profiles.last_name}
            </p>
          </div>
        </div>
      )}

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">More to read</h2>
            <Link
              href="/blogs"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedPosts.map((relatedPost) => (
              <BlogCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
