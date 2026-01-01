
-- Phase 1: Delete existing rental data
DELETE FROM rental_requests;
DELETE FROM rentals;

-- Phase 2: Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, room_number)
);

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS policies for rooms
CREATE POLICY "Anyone can view rooms" ON public.rooms
FOR SELECT USING (true);

CREATE POLICY "Landlords can insert rooms for their properties" ON public.rooms
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);

CREATE POLICY "Landlords can update rooms for their properties" ON public.rooms
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);

CREATE POLICY "Landlords can delete rooms for their properties" ON public.rooms
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);

-- Phase 3: Create room_assignments table
CREATE TABLE public.room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, student_id)
);

-- Enable RLS on room_assignments
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_assignments
CREATE POLICY "Students can view their own assignments" ON public.room_assignments
FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Landlords can view assignments for their properties" ON public.room_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.properties p ON r.property_id = p.id
    WHERE r.id = room_id AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Landlords can insert assignments for their properties" ON public.room_assignments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.properties p ON r.property_id = p.id
    WHERE r.id = room_id AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Landlords can update assignments for their properties" ON public.room_assignments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.properties p ON r.property_id = p.id
    WHERE r.id = room_id AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Landlords can delete assignments for their properties" ON public.room_assignments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.properties p ON r.property_id = p.id
    WHERE r.id = room_id AND p.landlord_id = auth.uid()
  )
);

-- Students can view active roommates in their room
CREATE POLICY "Students can view active roommates" ON public.room_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_assignments my_assignment
    WHERE my_assignment.student_id = auth.uid()
    AND my_assignment.room_id = room_id
    AND my_assignment.status = 'active'
  )
  AND status = 'active'
);

-- Phase 4: Update rental_requests table - drop unnecessary columns and update status constraint
ALTER TABLE public.rental_requests DROP COLUMN IF EXISTS landlord_response;

-- Update status to only allow pending and accepted
ALTER TABLE public.rental_requests DROP CONSTRAINT IF EXISTS rental_requests_status_check;
ALTER TABLE public.rental_requests ADD CONSTRAINT rental_requests_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined'));

-- Add trigger for updated_at on rooms
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on room_assignments
CREATE TRIGGER update_room_assignments_updated_at
BEFORE UPDATE ON public.room_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 5: Create database functions for workflow

-- Function to get available room for a property
CREATE OR REPLACE FUNCTION public.get_available_room(p_property_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_room_id UUID;
BEGIN
  SELECT r.id INTO available_room_id
  FROM public.rooms r
  WHERE r.property_id = p_property_id
  AND (
    SELECT COUNT(*) FROM public.room_assignments ra 
    WHERE ra.room_id = r.id
  ) < r.capacity
  ORDER BY r.room_number
  LIMIT 1;
  
  RETURN available_room_id;
END;
$$;

-- Function to accept rental request
CREATE OR REPLACE FUNCTION public.accept_rental_request(p_request_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_student_id UUID;
  v_landlord_id UUID;
  v_room_id UUID;
  v_room_number TEXT;
BEGIN
  -- Get request details
  SELECT rr.property_id, rr.student_id, p.landlord_id
  INTO v_property_id, v_student_id, v_landlord_id
  FROM public.rental_requests rr
  JOIN public.properties p ON rr.property_id = p.id
  WHERE rr.id = p_request_id AND rr.status = 'pending';
  
  -- Verify landlord owns the property
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Find available room
  v_room_id := public.get_available_room(v_property_id);
  
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'No available rooms';
  END IF;
  
  -- Get room number
  SELECT room_number INTO v_room_number FROM public.rooms WHERE id = v_room_id;
  
  -- Create room assignment
  INSERT INTO public.room_assignments (room_id, student_id, status)
  VALUES (v_room_id, v_student_id, 'reserved');
  
  -- Update request status
  UPDATE public.rental_requests SET status = 'accepted', updated_at = now()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'success', true,
    'room_id', v_room_id,
    'room_number', v_room_number
  );
END;
$$;

-- Function to confirm payment (make tenant active)
CREATE OR REPLACE FUNCTION public.confirm_payment(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
BEGIN
  -- Verify landlord owns the property
  SELECT p.landlord_id INTO v_landlord_id
  FROM public.room_assignments ra
  JOIN public.rooms r ON ra.room_id = r.id
  JOIN public.properties p ON r.property_id = p.id
  WHERE ra.id = p_assignment_id;
  
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Update assignment status to active
  UPDATE public.room_assignments 
  SET status = 'active', updated_at = now()
  WHERE id = p_assignment_id AND status = 'reserved';
  
  RETURN TRUE;
END;
$$;

-- Function to cancel reservation
CREATE OR REPLACE FUNCTION public.cancel_reservation(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
  v_student_id UUID;
  v_property_id UUID;
BEGIN
  -- Get assignment details
  SELECT p.landlord_id, ra.student_id, r.property_id 
  INTO v_landlord_id, v_student_id, v_property_id
  FROM public.room_assignments ra
  JOIN public.rooms r ON ra.room_id = r.id
  JOIN public.properties p ON r.property_id = p.id
  WHERE ra.id = p_assignment_id;
  
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Delete the assignment
  DELETE FROM public.room_assignments WHERE id = p_assignment_id;
  
  -- Update the rental request back to pending or delete it
  UPDATE public.rental_requests 
  SET status = 'pending', updated_at = now()
  WHERE student_id = v_student_id AND property_id = v_property_id AND status = 'accepted';
  
  RETURN TRUE;
END;
$$;
