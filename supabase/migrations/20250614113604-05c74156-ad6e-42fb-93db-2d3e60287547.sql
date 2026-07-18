
-- Create a table to store editable site content
CREATE TABLE public.site_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  content_data JSONB NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.staff(id)
);

-- Add Row Level Security
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Create policies for content management
CREATE POLICY "Admins can view all content" 
  ON public.site_content 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.staff 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create content" 
  ON public.site_content 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update content" 
  ON public.site_content 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.staff 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default content for hero section
INSERT INTO public.site_content (section_key, content_data, content_type) VALUES 
('hero_section', '{
  "title": "Connecting Global Buyers with Chinese Renewable Energy Products",
  "subtitle": "GridLoad sources high-quality solar panels, batteries, and inverters from verified Chinese manufacturers to power your sustainable energy projects.",
  "primaryButtonText": "Request a Quote",
  "secondaryButtonText": "Explore Products",
  "imageUrl": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200"
}', 'json'),

('product_categories', '{
  "sectionTitle": "Our Product Categories",
  "sectionSubtitle": "GridLoad sources high-quality renewable energy products from verified Chinese manufacturers, ensuring reliability, performance, and competitive pricing.",
  "categories": [
    {
      "id": 1,
      "title": "Solar Panels",
      "description": "High-efficiency mono and poly-crystalline solar panels from leading Chinese manufacturers with industry certifications.",
      "image": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600",
      "features": [
        "Monocrystalline & Polycrystalline",
        "Tier 1 Manufacturers",
        "IEC, TÜV, UL Certified",
        "25+ Year Warranties"
      ]
    },
    {
      "id": 2,
      "title": "Battery Storage",
      "description": "Lithium-ion, LFP and other energy storage solutions with reliable performance for residential and commercial applications.",
      "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600",
      "features": [
        "Lithium Iron Phosphate (LFP)",
        "Lithium-ion & NMC Batteries",
        "High Cycle Life",
        "Smart BMS Systems"
      ]
    },
    {
      "id": 3,
      "title": "Inverters",
      "description": "Grid-tie, off-grid, and hybrid inverters with advanced features and monitoring capabilities from trusted manufacturers.",
      "image": "https://images.unsplash.com/photo-1622855237380-4bbd68448968?auto=format&fit=crop&w=600",
      "features": [
        "String & Micro Inverters",
        "Single & Three Phase",
        "Grid-Tie & Off-Grid",
        "MPPT Technology"
      ]
    }
  ]
}', 'json'),

('contact_forms', '{
  "sectionTitle": "Contact GridLoad",
  "sectionSubtitle": "Whether you''re looking to source renewable energy products or become a supplier, we''re here to help. Fill out the appropriate form below and our team will get back to you promptly.",
  "buyerTab": "Request a Quote",
  "supplierTab": "Become a Supplier"
}', 'json');
