
-- 1. Add room_id to rental_requests
ALTER TABLE public.rental_requests ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);

-- 2. Add payment_status to room_assignments
ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

-- 3. Updated accept_rental_request function using room_id from request
CREATE OR REPLACE FUNCTION public.accept_rental_request(p_request_id UUID)
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
  v_landlord_id UUID;
BEGIN
  SELECT rr.*, p.landlord_id INTO v_request
  FROM rental_requests rr
  JOIN properties p ON rr.property_id = p.id
  WHERE rr.id = p_request_id AND rr.status = 'pending';
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not pending'; END IF;
  IF v_request.landlord_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF v_request.room_id IS NULL THEN
    v_request.room_id := public.get_available_room(v_request.property_id);
    IF v_request.room_id IS NULL THEN RAISE EXCEPTION 'No available rooms'; END IF;
  END IF;

  SELECT * INTO v_room FROM rooms WHERE id = v_request.room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;

  SELECT COUNT(*) INTO v_current_occupants
  FROM room_assignments WHERE room_id = v_room.id AND status IN ('active', 'reserved');
  IF v_current_occupants >= v_room.capacity THEN RAISE EXCEPTION 'Room is full'; END IF;

  INSERT INTO room_assignments (room_id, student_id, status, payment_status)
  VALUES (v_room.id, v_request.student_id, 'active', 'unpaid')
  RETURNING id INTO v_assignment_id;

  UPDATE rental_requests SET status = 'accepted', updated_at = NOW() WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'room_number', v_room.room_number, 'assignment_id', v_assignment_id);
END;
$$;

-- 4. Move-out function
CREATE OR REPLACE FUNCTION public.move_out_tenant(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
BEGIN
  SELECT p.landlord_id INTO v_landlord_id
  FROM room_assignments ra
  JOIN rooms r ON ra.room_id = r.id
  JOIN properties p ON r.property_id = p.id
  WHERE ra.id = p_assignment_id;

  IF v_landlord_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE room_assignments SET status = 'moved_out', updated_at = NOW()
  WHERE id = p_assignment_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found or not active'; END IF;
  RETURN true;
END;
$$;

-- 5. Payment status toggle
CREATE OR REPLACE FUNCTION public.toggle_payment_status(p_assignment_id UUID, p_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHERE id = p_assignment_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found or not active'; END IF;
  RETURN true;
END;
$$;

-- 6. Fix handle_new_user to save all student fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, first_name, surname, phone, email, gender, university, year_of_study)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'user_type',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'surname',
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'year_of_study'
  );
  RETURN NEW;
END;
$$;
