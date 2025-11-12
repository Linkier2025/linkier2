-- Create rental_requests table for students to request to rent properties
CREATE TABLE IF NOT EXISTS public.rental_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  student_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  student_message TEXT,
  landlord_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;

-- Students can create rental requests
CREATE POLICY "Students can create rental requests"
ON public.rental_requests
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can view their own requests
CREATE POLICY "Students can view their own requests"
ON public.rental_requests
FOR SELECT
USING (auth.uid() = student_id);

-- Students can update their own requests
CREATE POLICY "Students can update their own requests"
ON public.rental_requests
FOR UPDATE
USING (auth.uid() = student_id);

-- Landlords can view requests for their properties
CREATE POLICY "Landlords can view requests for their properties"
ON public.rental_requests
FOR SELECT
USING (auth.uid() = landlord_id);

-- Landlords can update requests for their properties
CREATE POLICY "Landlords can update requests for their properties"
ON public.rental_requests
FOR UPDATE
USING (auth.uid() = landlord_id);

-- Add trigger for updated_at
CREATE TRIGGER update_rental_requests_updated_at
BEFORE UPDATE ON public.rental_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();