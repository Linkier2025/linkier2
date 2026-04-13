
-- The handle_new_user trigger creates the profile automatically on signup.
-- Direct inserts are only needed as fallback. Since the trigger handles creation,
-- we can restrict direct inserts more tightly.
-- Use a security definer function to validate the user_type matches what's already stored
-- or allow initial insert only if no profile exists yet.

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND user_type IN ('student', 'landlord')
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid())
);
