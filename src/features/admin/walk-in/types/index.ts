export interface WalkInFormData {
  full_name: string;
  phone: string;
  email: string;
  service_id: string;
  specialist_id: string;
  branch_id: string;
  starts_at: string;
  notes: string;
}

export interface WalkInService {
  id: string;
  name: string;
  duration_minutes: number;
  min_price_cents: number;
  currency: string;
}

export interface WalkInSpecialist {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface WalkInBranch {
  id: string;
  name: string;
}
