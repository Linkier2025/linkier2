
-- Fix 1: Prevent role self-assignment by validating user_type against auth metadata
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND user_type = (auth.jwt() -> 'user_metadata' ->> 'user_type')
);

-- Fix 2: Change all public SELECT policies on profiles to authenticated only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Landlords can view student profiles for their requests" ON public.profiles;
CREATE POLICY "Landlords can view student profiles for their requests"
ON public.profiles FOR SELECT TO authenticated
USING (
  (EXISTS (SELECT 1 FROM property_viewings WHERE property_viewings.landlord_id = auth.uid() AND property_viewings.student_id = profiles.user_id))
  OR (EXISTS (SELECT 1 FROM rental_requests WHERE rental_requests.landlord_id = auth.uid() AND rental_requests.student_id = profiles.user_id))
);

DROP POLICY IF EXISTS "Landlords can view tenant profiles" ON public.profiles;
CREATE POLICY "Landlords can view tenant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM room_assignments ra
    JOIN rooms r ON ra.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE ra.student_id = profiles.user_id
    AND ra.status IN ('active', 'inactive')
    AND p.landlord_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students can view roommate profiles" ON public.profiles;
CREATE POLICY "Students can view roommate profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM room_assignments ra1
    JOIN room_assignments ra2 ON ra1.room_id = ra2.room_id
    WHERE ra1.student_id = auth.uid()
    AND ra2.student_id = profiles.user_id
    AND ra1.status = 'active'
    AND ra2.status = 'active'
  )
);

-- Also fix UPDATE policy to authenticated
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND user_type = get_own_user_type());
