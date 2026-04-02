
-- Add space type and gender_tag columns to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'bedroom';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS gender_tag text;

-- Make capacity nullable (shared spaces don't need capacity)
ALTER TABLE public.rooms ALTER COLUMN capacity DROP NOT NULL;
ALTER TABLE public.rooms ALTER COLUMN capacity DROP DEFAULT;
