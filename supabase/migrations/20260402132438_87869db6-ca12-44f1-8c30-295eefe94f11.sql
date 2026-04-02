
-- 1. Create is_landlord() helper function
CREATE OR REPLACE FUNCTION public.is_landlord()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'landlord'
  );
$$;

-- 2. Fix handle_new_user search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 3. Restrict landlord profile SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view landlord profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view landlord profiles"
ON public.profiles FOR SELECT TO authenticated
USING (user_type = 'landlord');

-- 4. Prevent user_type changes via profiles UPDATE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND user_type = (SELECT p.user_type FROM public.profiles p WHERE p.user_id = auth.uid()));

-- 5. Add is_landlord() check to properties INSERT
DROP POLICY IF EXISTS "Landlords can insert their own properties" ON public.properties;
CREATE POLICY "Landlords can insert their own properties"
ON public.properties FOR INSERT
WITH CHECK (auth.uid() = landlord_id AND public.is_landlord());

-- 6. Add is_landlord() check to rooms INSERT
DROP POLICY IF EXISTS "Landlords can insert rooms for their properties" ON public.rooms;
CREATE POLICY "Landlords can insert rooms for their properties"
ON public.rooms FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM properties WHERE properties.id = rooms.property_id AND properties.landlord_id = auth.uid())
  AND public.is_landlord()
);

-- 7. Add is_landlord() check to renovations INSERT
DROP POLICY IF EXISTS "Landlords can insert renovations for their properties" ON public.renovations;
CREATE POLICY "Landlords can insert renovations for their properties"
ON public.renovations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = landlord_id AND public.is_landlord());

-- 8. Add is_landlord() check to announcements INSERT
DROP POLICY IF EXISTS "Landlords can create announcements" ON public.announcements;
CREATE POLICY "Landlords can create announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = landlord_id
  AND EXISTS (SELECT 1 FROM properties WHERE properties.id = announcements.property_id AND properties.landlord_id = auth.uid())
  AND public.is_landlord()
);

-- 9. Fix student UPDATE policies with WITH CHECK constraints
-- rental_requests: students can only cancel their pending requests
DROP POLICY IF EXISTS "Students can update their own requests" ON public.rental_requests;
CREATE POLICY "Students can update their own requests"
ON public.rental_requests FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (
  auth.uid() = student_id
  AND status IN ('pending', 'cancelled')
);

-- property_viewings: students can only cancel their pending viewings
DROP POLICY IF EXISTS "Students can update their own requests" ON public.property_viewings;
CREATE POLICY "Students can update their own requests"
ON public.property_viewings FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (
  auth.uid() = student_id
  AND status IN ('pending', 'cancelled')
);

-- complaints: students can update pending complaints only
DROP POLICY IF EXISTS "Students can update their own complaints" ON public.complaints;
CREATE POLICY "Students can update their own complaints"
ON public.complaints FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (
  auth.uid() = student_id
  AND status IN ('pending', 'cancelled')
);

-- 10. Add missing payments UPDATE policy for assignment path
CREATE POLICY "Landlords can update payments via assignments"
ON public.payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM room_assignments ra
    JOIN rooms r ON ra.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE ra.id = payments.assignment_id AND p.landlord_id = auth.uid()
  )
);
