import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import type { BlogPost } from "../types";

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  return (
    <Card
      className={`group hover:shadow-md transition-all duration-200 p-0 overflow-hidden border border-border/50 hover:border-[#6B4423]/30 ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <Link href={`/blogs/${post.slug}`} className="block">
        {/* Image */}
        {post.featured_image_url && (
          <div
            className={`relative overflow-hidden ${featured ? "h-56" : "h-44"}`}
          >
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
            {post.is_featured && (
              <Badge className="absolute top-3 left-3 bg-[#6B4423] text-white border-0 text-xs font-medium shadow-lg">
                Featured
              </Badge>
            )}
          </div>
        )}

        {/* Body */}
        <CardContent className="p-4 pt-4">
          {/* Category + Date row */}
          <div className="flex items-center gap-1.5 mb-2.5">
            {post.blog_categories && (
              <Badge
                variant="outline"
                className="text-xs font-normal px-2 py-0.5 rounded-full"
              >
                {post.blog_categories.name}
              </Badge>
            )}
            <span className="text-muted-foreground/50 text-xs">·</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(post.published_at), "MMM d, yyyy")}
            </div>
          </div>

          {/* Title */}
          <h3
            className={`font-medium leading-snug group-hover:text-[#6B4423] transition-colors line-clamp-2 mb-2 ${
              featured ? "text-[19px]" : "text-base"
            }`}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p
              className={`text-sm text-muted-foreground leading-relaxed mb-0 ${
                featured ? "line-clamp-3" : "line-clamp-2"
              }`}
            >
              {post.excerpt}
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-border/50 my-3" />

          {/* Author + Meta row */}
          <div className="flex items-center justify-between">
            {/* Author */}
            <div className="flex items-center gap-2">
              {post.user_profiles && (
                <>
                  <div className="w-6 h-6 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-[10px] font-medium flex items-center justify-center flex-shrink-0">
                    {getInitials(
                      post.user_profiles.first_name,
                      post.user_profiles.last_name,
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {post.user_profiles.first_name}{" "}
                    {post.user_profiles.last_name}
                  </span>
                </>
              )}
            </div>

            {/* Read time + Views */}
            <div className="flex items-center gap-3">
              {post.read_time_minutes && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                  <Clock className="h-3 w-3" />
                  {post.read_time_minutes} min
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                <Eye className="h-3 w-3" />
                {post.view_count.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50"
                >
                  {tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
                  +{post.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
