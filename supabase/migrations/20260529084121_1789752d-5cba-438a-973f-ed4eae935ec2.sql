ALTER TABLE public.rental_requests DROP CONSTRAINT IF EXISTS rental_requests_status_check;
ALTER TABLE public.rental_requests ADD CONSTRAINT rental_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text,'offered'::text,'accepted'::text,'rejected'::text,'declined'::text,'cancelled'::text,'expired'::text,'approved'::text]));