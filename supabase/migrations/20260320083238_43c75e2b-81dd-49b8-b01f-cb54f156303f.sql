
-- Drop the recursive RLS policy
DROP POLICY IF EXISTS "Students can view active roommates" ON public.room_assignments;

-- Create a security definer function to check if a student shares a room
CREATE OR REPLACE FUNCTION public.is_roommate(p_user_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_assignments
    WHERE student_id = p_user_id
      AND room_id = p_room_id
      AND status = 'active'
  );
$$;

-- Recreate policy using the function to avoid recursion
CREATE POLICY "Students can view active roommates"
ON public.room_assignments
FOR SELECT
TO public
USING (
  (public.is_roommate(auth.uid(), room_id) AND status = 'active')
);
