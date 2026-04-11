-- Add new optional columns
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location_area TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS target_universities TEXT[];

-- Auto-migrate existing data: map existing location to new fields
UPDATE public.properties
SET location_city = 'Harare',
    location_area = location
WHERE location IS NOT NULL AND location_city IS NULL;