
-- 1. Migrate existing data: 'approved' -> 'offered' for rental_requests only
UPDATE public.rental_requests SET status = 'offered' WHERE status = 'approved';

-- 2. Update accept_rental_request to mark as 'offered'
CREATE OR REPLACE FUNCTION public.accept_rental_request(p_request_id uuid, p_assigned_room_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_final_room_id := COALESCE(p_assigned_room_id, v_request.preferred_room_id);

  IF v_final_room_id IS NULL THEN
    RAISE EXCEPTION 'A room must be assigned to send an offer';
  END IF;

  SELECT * INTO v_room FROM rooms WHERE id = v_final_room_id AND property_id = v_request.property_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found or does not belong to this property'; END IF;

  SELECT COUNT(*) INTO v_current_occupants
  FROM room_assignments WHERE room_id = v_final_room_id AND status IN ('active', 'reserved');
  IF v_current_occupants >= v_room.capacity THEN RAISE EXCEPTION 'Room is full'; END IF;

  UPDATE rental_requests
  SET status = 'offered', assigned_room_id = v_final_room_id, updated_at = NOW()
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'assigned_room_id', v_final_room_id);
END;
$function$;

-- 3. New canonical confirm_rental_offer (and update accept_offer to match)
CREATE OR REPLACE FUNCTION public.confirm_rental_offer(p_request_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_room RECORD;
  v_assignment_id UUID;
  v_current_occupants INT;
  v_existing_tenant INT;
  v_final_room_id UUID;
BEGIN
  SELECT * INTO v_request FROM rental_requests WHERE id = p_request_id AND status = 'offered';
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or no longer available'; END IF;
  IF v_request.student_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT COUNT(*) INTO v_existing_tenant
  FROM room_assignments WHERE student_id = v_request.student_id AND status = 'active';
  IF v_existing_tenant > 0 THEN RAISE EXCEPTION 'You already have an active room assignment'; END IF;

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

  -- Auto-cancel all other open requests from this student
  UPDATE rental_requests SET status = 'cancelled', updated_at = NOW()
  WHERE student_id = v_request.student_id
    AND id != p_request_id
    AND status IN ('pending', 'offered', 'approved');

  RETURN json_build_object('success', true, 'room_number', v_room.room_number, 'assignment_id', v_assignment_id);
END;
$function$;

-- Keep legacy accept_offer as an alias delegating to confirm_rental_offer
CREATE OR REPLACE FUNCTION public.accept_offer(p_request_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.confirm_rental_offer(p_request_id);
END;
$function$;

-- 4. Update notification trigger to fire on 'offered' status
CREATE OR REPLACE FUNCTION public.notify_student_rental_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('offered', 'declined', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
    VALUES (
      NEW.student_id,
      'rental_response',
      CASE WHEN NEW.status = 'offered' THEN 'You Received an Offer!'
           ELSE 'Rental Request Update' END,
      CASE WHEN NEW.status = 'offered' THEN 'A landlord has sent you an offer. Accept it to become a tenant.'
           ELSE 'Your rental request status has been updated' END,
      NEW.id,
      'rental_request'
    );
  END IF;
  RETURN NEW;
END;
$function$;
