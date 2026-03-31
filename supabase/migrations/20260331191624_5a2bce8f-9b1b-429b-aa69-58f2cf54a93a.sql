
-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Landlords can insert announcements for their properties
CREATE POLICY "Landlords can create announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = landlord_id
  AND EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid())
);

-- Landlords can view their own announcements
CREATE POLICY "Landlords can view their announcements"
ON public.announcements FOR SELECT TO authenticated
USING (auth.uid() = landlord_id);

-- Active tenants can view announcements for their property/room
CREATE POLICY "Tenants can view relevant announcements"
ON public.announcements FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.room_assignments ra
    JOIN public.rooms r ON ra.room_id = r.id
    WHERE ra.student_id = auth.uid()
      AND ra.status = 'active'
      AND r.property_id = announcements.property_id
      AND (announcements.room_id IS NULL OR announcements.room_id = ra.room_id)
  )
);
