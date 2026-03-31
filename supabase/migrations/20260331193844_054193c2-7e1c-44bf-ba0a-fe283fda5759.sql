
-- Add landlord_id column to complaints
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS landlord_id uuid;

-- Add room_id column to complaints  
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS room_id uuid;

-- Add RLS policy for landlords to view complaints via landlord_id
DROP POLICY IF EXISTS "Landlords can view complaints for their properties" ON public.complaints;
CREATE POLICY "Landlords can view complaints for their properties"
ON public.complaints FOR SELECT TO public
USING (auth.uid() = landlord_id);

-- Update landlord update policy to use landlord_id
DROP POLICY IF EXISTS "Landlords can update complaints for their properties" ON public.complaints;
CREATE POLICY "Landlords can update complaints for their properties"
ON public.complaints FOR UPDATE TO public
USING (auth.uid() = landlord_id);
