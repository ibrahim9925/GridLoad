export type PublicProduct = {
  id: string;
  sku: string | null;
  name: string;
  slug: string | null;
  category: string | null;
  product_type: string | null;
  brand: string | null;
  short_description: string | null;
  full_description: string | null;
  specs: Record<string, string> | null;
  images: string[] | null;
  image_url: string | null;
  datasheet_url: string | null;
  is_featured: boolean | null;
  is_active: boolean | null;
};

export type PublicProject = {
  id: string;
  title: string;
  location: string | null;
  country: string | null;
  system_size_kwp: number | null;
  description: string | null;
  images: string[] | null;
  completion_date: string | null;
  is_featured: boolean | null;
};

export type PublicAboutSection = {
  id: string;
  section_key: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  display_order: number;
};

export const PRODUCT_FIELDS =
  "id,sku,name,slug,category,product_type,brand,short_description,full_description,specs,images,image_url,datasheet_url,is_featured,is_active";
