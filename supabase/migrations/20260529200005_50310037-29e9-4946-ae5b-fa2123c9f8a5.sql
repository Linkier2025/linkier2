
-- Add listing_incomplete flag and enforce landlord contact completeness

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_incomplete BOOLEAN NOT NULL DEFAULT false;

-- Helper: is a landlord profile complete enough to publish?
CREATE OR REPLACE FUNCTION public.landlord_profile_complete(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_user_id
      AND user_type = 'landlord'
      AND COALESCE(NULLIF(TRIM(first_name), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(TRIM(surname), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(TRIM(phone), ''), NULL) IS NOT NULL
  );
$$;

-- Trigger on properties: set flag automatically on insert/update
CREATE OR REPLACE FUNCTION public.set_property_listing_incomplete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.listing_incomplete := NOT public.landlord_profile_complete(NEW.landlord_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_property_listing_incomplete ON public.properties;
CREATE TRIGGER trg_set_property_listing_incomplete
BEFORE INSERT OR UPDATE OF landlord_id ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.set_property_listing_incomplete();

-- Trigger on profiles: when landlord updates their profile, re-sync their properties
CREATE OR REPLACE FUNCTION public.sync_landlord_properties_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type = 'landlord' THEN
    UPDATE public.properties
      SET listing_incomplete = NOT public.landlord_profile_complete(NEW.user_id),
          updated_at = NOW()
      WHERE landlord_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_landlord_properties_completeness ON public.profiles;
CREATE TRIGGER trg_sync_landlord_properties_completeness
AFTER INSERT OR UPDATE OF first_name, surname, phone, user_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_landlord_properties_completeness();

-- Backfill flag for existing properties
UPDATE public.properties p
SET listing_incomplete = NOT public.landlord_profile_complete(p.landlord_id);

-- Update RLS so students/public cannot see incomplete listings; landlords still see their own
DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;
CREATE POLICY "Anyone can view available properties"
ON public.properties
FOR SELECT
USING (
  (status = 'available' AND listing_incomplete = false)
  OR landlord_id = auth.uid()
);
