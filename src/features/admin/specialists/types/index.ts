export interface Specialist {
  id: string;
  branch_id: string;
  name: string;
  title: string;
  bio?: string;
  email?: string;
  phone?: string;
  image_url?: string;
  specialties?: string[];
  availability?: AvailabilityConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relationships (populated via joins)
  branch?: Branch;
  services?: Service[];
}

export interface Branch {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed relationships
  specialists?: Specialist[];
}

export interface Service {
  id: string;
  category_id?: string;
  name: string;
  slug: string;
  description?: string;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  cover_image_url?: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityConfig {
  [dayOfWeek: string]: {
    is_available: boolean;
    start_time: string;
    end_time: string;
  };
}

export interface SpecialistFormData {
  name: string;
  title: string;
  bio?: string;
  email?: string;
  phone?: string;
  branch_id: string;
  specialties: string[];
  availability: AvailabilityConfig;
  is_active: boolean;
  serviceIds: string[];
}