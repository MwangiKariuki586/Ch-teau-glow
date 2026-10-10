'use client';

import { useState } from 'react';
import { BlogList, BlogForm } from '@/features/admin/blogs';
import type { BlogPost } from '@/features/admin/blogs';

export default function BlogsPage() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | undefined>();

  const handleCreateNew = () => {
    setEditingPost(undefined);
    setView('create');
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setView('edit');
  };

  const handleSuccess = () => {
    setView('list');
    setEditingPost(undefined);
  };

  const handleCancel = () => {
    setView('list');
    setEditingPost(undefined);
  };

  if (view === 'create' || view === 'edit') {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {view === 'create' ? 'Create New Post' : 'Edit Post'}
          </h1>
        </div>
        <BlogForm
          post={editingPost}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <BlogList
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
      />
    </div>
  );
}