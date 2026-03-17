
-- 1. Replace accept_rental_request: only set status='approved', do NOT create room assignment
CREATE OR REPLACE FUNCTION public.accept_rental_request(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT rr.*, p.landlord_id INTO v_request
  FROM rental_requests rr
  JOIN properties p ON rr.property_id = p.id
  WHERE rr.id = p_request_id AND rr.status = 'pending';
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not pending'; END IF;
  IF v_request.landlord_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Just mark as approved (offer sent) - student must accept
  UPDATE rental_requests SET status = 'approved', updated_at = NOW() WHERE id = p_request_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 2. New function: student accepts an offer
CREATE OR REPLACE FUNCTION public.accept_offer(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_room RECORD;
  v_assignment_id UUID;
  v_current_occupants INT;
  v_existing_tenant INT;
BEGIN
  -- Get the approved request
  SELECT * INTO v_request FROM rental_requests WHERE id = p_request_id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or not approved'; END IF;
  
  -- Verify the student is the one accepting
  IF v_request.student_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Check if student already has an active tenant record
  SELECT COUNT(*) INTO v_existing_tenant
  FROM room_assignments WHERE student_id = v_request.student_id AND status = 'active';
  IF v_existing_tenant > 0 THEN RAISE EXCEPTION 'You already have an active room assignment'; END IF;

  -- Resolve room
  IF v_request.room_id IS NULL THEN
    v_request.room_id := public.get_available_room(v_request.property_id);
    IF v_request.room_id IS NULL THEN RAISE EXCEPTION 'No available rooms'; END IF;
  END IF;

  SELECT * INTO v_room FROM rooms WHERE id = v_request.room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;

  -- Check capacity
  SELECT COUNT(*) INTO v_current_occupants
  FROM room_assignments WHERE room_id = v_room.id AND status IN ('active', 'reserved');
  IF v_current_occupants >= v_room.capacity THEN RAISE EXCEPTION 'Room is full'; END IF;

  -- Create tenant record
  INSERT INTO room_assignments (room_id, student_id, status, payment_status)
  VALUES (v_room.id, v_request.student_id, 'active', 'unpaid')
  RETURNING id INTO v_assignment_id;

  -- Mark this request as accepted
  UPDATE rental_requests SET status = 'accepted', updated_at = NOW() WHERE id = p_request_id;

  -- Cancel all other pending and approved requests from this student
  UPDATE rental_requests SET status = 'cancelled', updated_at = NOW()
  WHERE student_id = v_request.student_id AND id != p_request_id AND status IN ('pending', 'approved');

  RETURN json_build_object('success', true, 'room_number', v_room.room_number, 'assignment_id', v_assignment_id);
END;
$$;
