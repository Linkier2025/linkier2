
-- Step 1: Rename room_id to preferred_room_id
ALTER TABLE public.rental_requests RENAME COLUMN room_id TO preferred_room_id;

-- Step 2: Add assigned_room_id column
ALTER TABLE public.rental_requests ADD COLUMN assigned_room_id UUID REFERENCES public.rooms(id);

-- Step 3: Update accept_rental_request to support room override
CREATE OR REPLACE FUNCTION public.accept_rental_request(p_request_id UUID, p_assigned_room_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_room RECORD;
  v_current_occupants INT;
  v_final_room_id UUID;
BEGIN
  SELECT rr.*, p.landlord_id INTO v_request
  FROM rental_requests rr
  JOIN properties p ON rr.property_id = p.id
  WHERE rr.id = p_request_id AND rr.status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not pending'; END IF;
  IF v_request.landlord_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Determine final room: override or preferred
  v_final_room_id := COALESCE(p_assigned_room_id, v_request.preferred_room_id);

  -- Validate room if specified
  IF v_final_room_id IS NOT NULL THEN
    SELECT * INTO v_room FROM rooms WHERE id = v_final_room_id AND property_id = v_request.property_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Room not found or does not belong to this property'; END IF;

    SELECT COUNT(*) INTO v_current_occupants
    FROM room_assignments WHERE room_id = v_final_room_id AND status IN ('active', 'reserved');
    IF v_current_occupants >= v_room.capacity THEN RAISE EXCEPTION 'Room is full'; END IF;
  END IF;

  -- Set assigned_room_id and mark as approved (offer sent)
  UPDATE rental_requests
  SET status = 'approved', assigned_room_id = v_final_room_id, updated_at = NOW()
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'assigned_room_id', v_final_room_id);
END;
$$;

-- Step 4: Update accept_offer to use assigned_room_id
CREATE OR REPLACE FUNCTION public.accept_offer(p_request_id UUID)
RETURNS JSON
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
  v_final_room_id UUID;
BEGIN
  SELECT * INTO v_request FROM rental_requests WHERE id = p_request_id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or not approved'; END IF;
  IF v_request.student_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT COUNT(*) INTO v_existing_tenant
  FROM room_assignments WHERE student_id = v_request.student_id AND status = 'active';
  IF v_existing_tenant > 0 THEN RAISE EXCEPTION 'You already have an active room assignment'; END IF;

  -- Use assigned_room_id first, then preferred, then auto-find
  v_final_room_id := COALESCE(v_request.assigned_room_id, v_request.preferred_room_id);
  IF v_final_room_id IS NULL THEN
    v_final_room_id := public.get_available_room(v_request.property_id);
    IF v_final_room_id IS NULL THEN RAISE EXCEPTION 'No available rooms'; END IF;
  END IF;

  SELECT * INTO v_room FROM rooms WHERE id = v_final_room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;

  SELECT COUNT(*) INTO v_current_occupants
  FROM room_assignments WHERE room_id = v_room.id AND status IN ('active', 'reserved');
  IF v_current_occupants >= v_room.capacity THEN RAISE EXCEPTION 'Room is full'; END IF;

  INSERT INTO room_assignments (room_id, student_id, status, payment_status)
  VALUES (v_room.id, v_request.student_id, 'active', 'unpaid')
  RETURNING id INTO v_assignment_id;

  UPDATE rental_requests SET status = 'accepted', updated_at = NOW() WHERE id = p_request_id;
  UPDATE rental_requests SET status = 'cancelled', updated_at = NOW()
  WHERE student_id = v_request.student_id AND id != p_request_id AND status IN ('pending', 'approved');

  RETURN json_build_object('success', true, 'room_number', v_room.room_number, 'assignment_id', v_assignment_id);
END;
$$;
