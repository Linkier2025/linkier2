-- Create complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  property_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_property FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Students can view their own complaints
CREATE POLICY "Students can view their own complaints"
ON public.complaints
FOR SELECT
USING (auth.uid() = student_id);

-- Students can create complaints
CREATE POLICY "Students can create complaints"
ON public.complaints
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Landlords can view complaints for their properties
CREATE POLICY "Landlords can view complaints for their properties"
ON public.complaints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = complaints.property_id
    AND properties.landlord_id = auth.uid()
  )
);

-- Landlords can update complaints for their properties
CREATE POLICY "Landlords can update complaints for their properties"
ON public.complaints
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = complaints.property_id
    AND properties.landlord_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();