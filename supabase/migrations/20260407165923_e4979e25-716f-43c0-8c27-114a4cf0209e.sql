-- Clean up orphaned rental_requests
DELETE FROM public.rental_requests
WHERE property_id NOT IN (SELECT id FROM public.properties);

-- 1. Add FK from rental_requests.property_id to properties.id
ALTER TABLE public.rental_requests
  ADD CONSTRAINT rental_requests_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id);

-- 2. Add RLS policy: students can view landlord profiles for available properties
CREATE POLICY "Students can view landlord profiles for available properties"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_type = 'landlord' AND EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.landlord_id = profiles.user_id
      AND properties.status = 'available'
  )
);