import { createClient } from './client';

/**
 * Generic database query helper
 */
export async function query<T = any>(
  table: string,
  options?: {
    select?: string;
    filter?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
) {
  const supabase = createClient();
  
  let query = supabase
    .from(table)
    .select(options?.select || '*');

  // Apply filters
  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Apply ordering
  if (options?.order) {
    query = query.order(options.order.column, {
      ascending: options.order.ascending ?? true,
    });
  }

  // Apply pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as T[];
}

/**
 * Insert a record
 */
export async function insert<T = any>(table: string, data: Partial<T>) {
  const supabase = createClient();
  
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return result as T;
}

/**
 * Update a record
 */
export async function update<T = any>(
  table: string,
  id: string,
  data: Partial<T>
) {
  const supabase = createClient();
  
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return result as T;
}

/**
 * Delete a record
 */
export async function deleteRecord(table: string, id: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Get a single record by ID
 */
export async function getById<T = any>(table: string, id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data as T;
}

/**
 * Count records
 */
export async function count(table: string, filter?: Record<string, any>) {
  const supabase = createClient();
  
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}
