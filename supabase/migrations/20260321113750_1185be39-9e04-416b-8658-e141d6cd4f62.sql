
-- Add assignment_id to payments table (link to room_assignments instead of only rentals)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.room_assignments(id),
  ADD COLUMN IF NOT EXISTS months_paid_for integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_period_start date,
  ADD COLUMN IF NOT EXISTS payment_period_end date,
  ADD COLUMN IF NOT EXISTS next_due_date date,
  ADD COLUMN IF NOT EXISTS remaining_balance numeric DEFAULT 0;

-- Make rental_id nullable since we'll now also support assignment_id
ALTER TABLE public.payments ALTER COLUMN rental_id DROP NOT NULL;

-- Add RLS policies for payments via room_assignments
CREATE POLICY "Landlords can insert payments via assignments"
ON public.payments
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_assignments ra
    JOIN public.rooms r ON ra.room_id = r.id
    JOIN public.properties p ON r.property_id = p.id
    WHERE ra.id = payments.assignment_id AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Landlords can view payments via assignments"
ON public.payments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.room_assignments ra
    JOIN public.rooms r ON ra.room_id = r.id
    JOIN public.properties p ON r.property_id = p.id
    WHERE ra.id = payments.assignment_id AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Students can view their payments via assignments"
ON public.payments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.room_assignments ra
    WHERE ra.id = payments.assignment_id AND ra.student_id = auth.uid()
  )
);

-- Add renovation fields to rooms table
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS renovation_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS renovation_description text,
  ADD COLUMN IF NOT EXISTS renovation_start_date date;
