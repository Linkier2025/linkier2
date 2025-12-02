CREATE TABLE public.renovations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  room_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  estimated_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.renovations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can insert renovations for their properties"
ON public.renovations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can view their renovations"
ON public.renovations
FOR SELECT
TO authenticated
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their renovations"
ON public.renovations
FOR UPDATE
TO authenticated
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their renovations"
ON public.renovations
FOR DELETE
TO authenticated
USING (auth.uid() = landlord_id);

CREATE POLICY "Students can view renovations for their rentals"
ON public.renovations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rentals
    WHERE rentals.property_id = renovations.property_id
      AND rentals.student_id = auth.uid()
      AND rentals.status = 'active'
  )
);

CREATE TRIGGER update_renovations_updated_at
BEFORE UPDATE ON public.renovations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();