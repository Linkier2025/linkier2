
-- Update move_out_tenant to also create a notification for the student
CREATE OR REPLACE FUNCTION public.move_out_tenant(p_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
  v_student_id UUID;
  v_property_title TEXT;
BEGIN
  SELECT p.landlord_id, ra.student_id, p.title
  INTO v_landlord_id, v_student_id, v_property_title
  FROM room_assignments ra
  JOIN rooms r ON ra.room_id = r.id
  JOIN properties p ON r.property_id = p.id
  WHERE ra.id = p_assignment_id;

  IF v_landlord_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE room_assignments SET status = 'moved_out', updated_at = NOW()
  WHERE id = p_assignment_id AND status IN ('active', 'inactive');
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found or not active/inactive'; END IF;

  -- Send notification to student
  INSERT INTO notifications (user_id, type, title, description, related_id, related_type)
  VALUES (
    v_student_id,
    'move_out',
    'You have been moved out',
    'You are no longer a tenant at ' || v_property_title,
    p_assignment_id,
    'room_assignment'
  );

  RETURN true;
END;
$$;

-- New function to toggle tenant between active and inactive
CREATE OR REPLACE FUNCTION public.toggle_tenant_status(p_assignment_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
BEGIN
  IF p_status NOT IN ('active', 'inactive') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT p.landlord_id INTO v_landlord_id
  FROM room_assignments ra
  JOIN rooms r ON ra.room_id = r.id
  JOIN properties p ON r.property_id = p.id
  WHERE ra.id = p_assignment_id;

  IF v_landlord_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE room_assignments SET status = p_status, updated_at = NOW()
  WHERE id = p_assignment_id AND status IN ('active', 'inactive');
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found or not active/inactive'; END IF;

  RETURN true;
END;
$$;
