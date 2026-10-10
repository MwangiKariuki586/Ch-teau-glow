import { createClient } from './client';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean }
) {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert || false,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, path: string) {
  const supabase = createClient();
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string) {
  const supabase = createClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;
  
  await uploadFile('avatars', filePath, file, { upsert: true });
  
  return getPublicUrl('avatars', filePath);
}

/**
 * Upload product image
 */
export async function uploadProductImage(productId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const filePath = `${productId}/${timestamp}.${fileExt}`;
  
  await uploadFile('product-images', filePath, file);
  
  return getPublicUrl('product-images', filePath);
}
/**
 * Upload blog image
 */
export async function uploadBlogImage(slug: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const filePath = `${slug}/${timestamp}.${fileExt}`;
  
  await uploadFile('blog-images', filePath, file);
  
  return getPublicUrl('blog-images', filePath);
}
