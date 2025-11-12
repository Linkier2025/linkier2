-- Create property viewings table
CREATE TABLE public.property_viewings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  student_message TEXT,
  landlord_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_viewings ENABLE ROW LEVEL SECURITY;

-- Students can insert their own viewing requests
CREATE POLICY "Students can create viewing requests"
ON public.property_viewings
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can view their own requests
CREATE POLICY "Students can view their own requests"
ON public.property_viewings
FOR SELECT
USING (auth.uid() = student_id);

-- Students can update their own requests (to cancel)
CREATE POLICY "Students can update their own requests"
ON public.property_viewings
FOR UPDATE
USING (auth.uid() = student_id);

-- Landlords can view requests for their properties
CREATE POLICY "Landlords can view requests for their properties"
ON public.property_viewings
FOR SELECT
USING (auth.uid() = landlord_id);

-- Landlords can update requests for their properties
CREATE POLICY "Landlords can update requests for their properties"
ON public.property_viewings
FOR UPDATE
USING (auth.uid() = landlord_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_property_viewings_updated_at
BEFORE UPDATE ON public.property_viewings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();