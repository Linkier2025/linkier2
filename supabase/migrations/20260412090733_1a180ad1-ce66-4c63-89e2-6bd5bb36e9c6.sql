
-- Create a SECURITY DEFINER function to get the user's own user_type without triggering RLS
CREATE OR REPLACE FUNCTION public.get_own_user_type()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_own_user_type FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_user_type TO authenticated;

-- Drop the recursive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with safe function reference
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND user_type = public.get_own_user_type());
