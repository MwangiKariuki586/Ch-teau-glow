"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { TiptapEditor } from "./tiptap-editor";
import { blogApi } from "../api";
import { uploadBlogImage } from "@/lib/supabase/storage";
import type {
  BlogPost,
  BlogCategory,
  CreateBlogPostData,
  UpdateBlogPostData,
} from "../types";
import { toast } from "sonner";

const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional(),
  category_id: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  is_featured: z.boolean(),
  featured_image_url: z.string().optional().or(z.literal("")),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;

interface BlogFormProps {
  post?: BlogPost;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BlogForm({ post, onSuccess, onCancel }: BlogFormProps) {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [content, setContent] = useState(post?.content || {});
  const [contentHtml, setContentHtml] = useState(post?.content_html || "");
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    post?.featured_image_url || "",
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title || "",
      slug: post?.slug || "",
      excerpt: post?.excerpt || "",
      category_id: post?.category_id || "",
      status: post?.status || "draft",
      is_featured: post?.is_featured || false,
      featured_image_url: post?.featured_image_url || "",
      meta_title: post?.meta_title || "",
      meta_description: post?.meta_description || "",
    },
  });

  const watchTitle = watch("title");
  const watchSlug = watch("slug");

  // Auto-generate slug from title
  useEffect(() => {
    if (watchTitle && !post) {
      const slug = watchTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setValue("slug", slug);
    }
  }, [watchTitle, setValue, post]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await blogApi.getBlogCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error loading categories:", error);
        toast.error("Failed to load categories");
      }
    };
    loadCategories();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setValue("featured_image_url", "");
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const onSubmit = async (data: BlogPostFormData) => {
    setIsLoading(true);
    try {
      let finalImageUrl = data.featured_image_url;

      // 1. Upload image if a new one was selected
      if (imageFile) {
        try {
          finalImageUrl = await uploadBlogImage(data.slug, imageFile);
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast.error("Failed to upload image. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      const postData = {
        ...data,
        content,
        content_html: contentHtml,
        tags,
        featured_image_url: finalImageUrl || undefined,
        category_id:
          data.category_id && data.category_id !== "none"
            ? data.category_id
            : undefined,
      };

      if (post) {
        await blogApi.updateBlogPost({
          id: post.id,
          ...postData,
        } as UpdateBlogPostData);
        toast.success("Blog post updated successfully");
      } else {
        await blogApi.createBlogPost(postData as CreateBlogPostData);
        toast.success("Blog post created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error("Failed to save blog post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="py-0">
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="Enter post title"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  {...register("slug")}
                  placeholder="post-url-slug"
                />
                {errors.slug && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.slug.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  {...register("excerpt")}
                  placeholder="Brief description of the post"
                  rows={3}
                />
              </div>

              <div>
                <Label>Content</Label>
                <TiptapEditor
                  content={content}
                  onChange={setContent}
                  onHtmlChange={setContentHtml}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div>
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  {...register("meta_title")}
                  placeholder="SEO title (optional)"
                />
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  {...register("meta_description")}
                  placeholder="SEO description (optional)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="py-0">
            <CardHeader>
              <CardTitle>Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) => setValue("status", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={watch("is_featured")}
                  onCheckedChange={(checked) =>
                    setValue("is_featured", checked)
                  }
                />
                <Label htmlFor="is_featured">Featured Post</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload image
                      </p>
                    </div>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </Label>
                )}

                <div className="text-xs text-muted-foreground">
                  <p>Recommended size: 1200x630px</p>
                  <p>Max file size: 5MB</p>
                </div>

                <div className="pt-2 border-t mt-4">
                  <Label
                    htmlFor="featured_image_url"
                    className="text-xs font-medium text-muted-foreground uppercase"
                  >
                    Or Use External URL
                  </Label>
                  <Input
                    id="featured_image_url"
                    {...register("featured_image_url")}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                    onChange={(e) => {
                      const url = e.target.value;
                      setValue("featured_image_url", url);
                      if (url && !imageFile) {
                        setImagePreview(url);
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category_id">Category</Label>
                <Select
                  value={watch("category_id")}
                  onValueChange={(value) => setValue("category_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : post ? "Update Post" : "Create Post"}
        </Button>
      </div>
    </form>
  );
}
