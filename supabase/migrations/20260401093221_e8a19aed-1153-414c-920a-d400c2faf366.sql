
-- Create room_furniture table
CREATE TABLE public.room_furniture (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_furniture ENABLE ROW LEVEL SECURITY;

-- Anyone can view furniture (same as rooms - public read)
CREATE POLICY "Anyone can view room furniture"
  ON public.room_furniture FOR SELECT
  USING (true);

-- Landlords can manage furniture for their properties
CREATE POLICY "Landlords can insert furniture"
  ON public.room_furniture FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM rooms r JOIN properties p ON r.property_id = p.id
    WHERE r.id = room_furniture.room_id AND p.landlord_id = auth.uid()
  ));

CREATE POLICY "Landlords can update furniture"
  ON public.room_furniture FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM rooms r JOIN properties p ON r.property_id = p.id
    WHERE r.id = room_furniture.room_id AND p.landlord_id = auth.uid()
  ));

CREATE POLICY "Landlords can delete furniture"
  ON public.room_furniture FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM rooms r JOIN properties p ON r.property_id = p.id
    WHERE r.id = room_furniture.room_id AND p.landlord_id = auth.uid()
  ));
