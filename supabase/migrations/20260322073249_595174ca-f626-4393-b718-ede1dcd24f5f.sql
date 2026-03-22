
-- Allow students to view profiles of their roommates
CREATE POLICY "Students can view roommate profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.room_assignments ra1
    JOIN public.room_assignments ra2 ON ra1.room_id = ra2.room_id
    WHERE ra1.student_id = auth.uid()
      AND ra2.student_id = profiles.user_id
      AND ra1.status = 'active'
      AND ra2.status = 'active'
  )
);

-- Also allow landlords to view profiles of their active tenants (for rent tracking)
CREATE POLICY "Landlords can view tenant profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.room_assignments ra
    JOIN public.rooms r ON ra.room_id = r.id
    JOIN public.properties p ON r.property_id = p.id
    WHERE ra.student_id = profiles.user_id
      AND ra.status = 'active'
      AND p.landlord_id = auth.uid()
  )
);
