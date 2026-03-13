-- MVP Workflow Migration: Run this when database connection is restored
-- 
-- 1. Add room_id to rental_requests so students can request specific rooms
-- 2. Add payment_status to room_assignments for Paid/Unpaid tracking
-- 3. Update accept_rental_request to use selected room
-- 4. Add move_out_tenant and toggle_payment_status functions

-- Step 1: Schema changes
ALTER TABLE public.rental_requests ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);
ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

-- Step 2: Updated accept_rental_request function
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
BEGIN
  SELECT * INTO v_request FROM rental_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not pending'; END IF;

  IF v_request.room_id IS NULL THEN RAISE EXCEPTION 'No room specified in the request'; END IF;

  SELECT * INTO v_room FROM rooms WHERE id = v_request.room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;

  SELECT COUNT(*) INTO v_current_occupants
  FROM room_assignments WHERE room_id = v_room.id AND status IN ('active', 'reserved');

  IF v_current_occupants >= v_room.capacity THEN RAISE EXCEPTION 'Room is full'; END IF;

  INSERT INTO room_assignments (room_id, student_id, status, payment_status)
  VALUES (v_room.id, v_request.student_id, 'active', 'unpaid')
  RETURNING id INTO v_assignment_id;

  UPDATE rental_requests SET status = 'accepted', updated_at = NOW() WHERE id = p_request_id;
  UPDATE rental_requests SET status = 'declined', updated_at = NOW()
  WHERE student_id = v_request.student_id AND id != p_request_id AND status = 'pending';

  RETURN json_build_object('success', true, 'room_number', v_room.room_number, 'assignment_id', v_assignment_id);
END;
$$;

-- Step 3: Move-out function
CREATE OR REPLACE FUNCTION public.move_out_tenant(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE room_assignments SET status = 'moved_out', updated_at = NOW()
  WHERE id = p_assignment_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found or not active'; END IF;
  RETURN true;
END;
$$;

-- Step 4: Payment status toggle
CREATE OR REPLACE FUNCTION public.toggle_payment_status(p_assignment_id UUID, p_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('paid', 'unpaid') THEN RAISE EXCEPTION 'Invalid payment status'; END IF;
  UPDATE room_assignments SET payment_status = p_status, updated_at = NOW()
  WHERE id = p_assignment_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found or not active'; END IF;
  RETURN true;
END;
$$;
