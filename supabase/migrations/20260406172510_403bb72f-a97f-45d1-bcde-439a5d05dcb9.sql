
-- Update toggle_payment_status to work for both active AND inactive tenants
CREATE OR REPLACE FUNCTION public.toggle_payment_status(p_assignment_id uuid, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_landlord_id UUID;
BEGIN
  IF p_status NOT IN ('paid', 'unpaid') THEN RAISE EXCEPTION 'Invalid payment status'; END IF;

  SELECT p.landlord_id INTO v_landlord_id
  FROM room_assignments ra
  JOIN rooms r ON ra.room_id = r.id
  JOIN properties p ON r.property_id = p.id
  WHERE ra.id = p_assignment_id;

  IF v_landlord_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE room_assignments SET payment_status = p_status, updated_at = NOW()
  WHERE id = p_assignment_id AND status IN ('active', 'inactive');
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found or not active/inactive'; END IF;
  RETURN true;
END;
$$;

-- Update landlord tenant profile policy to include inactive tenants
DROP POLICY IF EXISTS "Landlords can view tenant profiles" ON public.profiles;
CREATE POLICY "Landlords can view tenant profiles"
  ON public.profiles FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM room_assignments ra
    JOIN rooms r ON ra.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE ra.student_id = profiles.user_id
      AND ra.status IN ('active', 'inactive')
      AND p.landlord_id = auth.uid()
  ));
