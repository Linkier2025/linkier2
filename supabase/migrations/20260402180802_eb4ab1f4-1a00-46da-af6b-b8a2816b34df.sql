
-- 1. Fix landlord profile exposure: replace broad policy with relationship-based access
DROP POLICY IF EXISTS "Authenticated users can view landlord profiles" ON public.profiles;

-- Students can view landlord profiles only when they have a relationship
CREATE POLICY "Students can view landlord profiles via requests"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_type = 'landlord' AND (
    -- Student has a viewing request with this landlord
    EXISTS (SELECT 1 FROM property_viewings pv WHERE pv.student_id = auth.uid() AND pv.landlord_id = profiles.user_id)
    OR
    -- Student has a rental request with this landlord
    EXISTS (SELECT 1 FROM rental_requests rr WHERE rr.student_id = auth.uid() AND rr.landlord_id = profiles.user_id)
    OR
    -- Student is an active tenant of this landlord's property
    EXISTS (
      SELECT 1 FROM room_assignments ra
      JOIN rooms r ON ra.room_id = r.id
      JOIN properties p ON r.property_id = p.id
      WHERE ra.student_id = auth.uid() AND ra.status = 'active' AND p.landlord_id = profiles.user_id
    )
    OR
    -- The user IS this landlord (self-view handled by other policy, but safe to include)
    auth.uid() = profiles.user_id
  )
);

-- Landlords can view other landlord profiles they interact with (property context)
CREATE POLICY "Landlords can view landlord profiles for property listings"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_type = 'landlord' AND auth.uid() = profiles.user_id
);

-- 2. Fix property-images storage: restrict uploads to landlord's own folder
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Landlords can upload to own folder in property-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text
);
