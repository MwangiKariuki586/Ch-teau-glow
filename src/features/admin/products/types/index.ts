export type Product = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  branch_id: string;
  price_display: string;
  price_value: number | null;
  unit_price: number | null;
  currency: string;
  rating: number;
  description: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
};

export type ProductWithRelations = Product & {
  product_categories: { name: string } | { name: string }[] | null;
  branches: { name: string } | { name: string }[] | null;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type BranchOption = {
  id: string;
  name: string;
};
