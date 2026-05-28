
-- 1. Prevent user_type escalation via profile UPDATE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND user_type = (SELECT p.user_type FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Hard guarantee via trigger: user_type cannot change after insert
CREATE OR REPLACE FUNCTION public.prevent_user_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    RAISE EXCEPTION 'Changing user_type is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_type_change_trg ON public.profiles;
CREATE TRIGGER prevent_user_type_change_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_type_change();

-- 2. Tighten landlord profile exposure: require an existing relationship
DROP POLICY IF EXISTS "Students can view landlord profiles for available properties" ON public.profiles;

-- 3. Restrict rooms listing to authenticated users
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Authenticated users can view rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (true);

-- 4. Restrict room_furniture listing to authenticated users
DROP POLICY IF EXISTS "Anyone can view room furniture" ON public.room_furniture;
CREATE POLICY "Authenticated users can view room furniture"
ON public.room_furniture
FOR SELECT
TO authenticated
USING (true);

-- 5. Realtime channel authorization for notifications
-- Scope subscriptions: users may only subscribe to notifications:<their own uid>
DROP POLICY IF EXISTS "Users can subscribe to own notification channel" ON realtime.messages;
CREATE POLICY "Users can subscribe to own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
);

-- 6. Prevent public listing of storage buckets via storage.objects
-- Public URL endpoint still works for public buckets; only listing is blocked.
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
