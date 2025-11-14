-- Allow users to view landlord profiles (for property listings)
CREATE POLICY "Anyone can view landlord profiles"
ON public.profiles
FOR SELECT
USING (user_type = 'landlord');