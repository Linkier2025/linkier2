-- Add room_assignment_id to complaints
ALTER TABLE public.complaints
ADD COLUMN room_assignment_id uuid REFERENCES public.room_assignments(id) ON DELETE SET NULL;