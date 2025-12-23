-- Add original_id column to programs for CSV import matching
ALTER TABLE public.programs ADD COLUMN original_id text;

-- Add original_id column to packages for CSV import matching  
ALTER TABLE public.packages ADD COLUMN original_id text;

-- Create index for faster lookups during import
CREATE INDEX idx_programs_original_id ON public.programs(original_id);
CREATE INDEX idx_packages_original_id ON public.packages(original_id);