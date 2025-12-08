-- Allow landlords to view student profiles when they have received a viewing or rental request from that student
CREATE POLICY "Landlords can view student profiles for their requests"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_viewings
    WHERE property_viewings.landlord_id = auth.uid()
    AND property_viewings.student_id = profiles.user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM rental_requests
    WHERE rental_requests.landlord_id = auth.uid()
    AND rental_requests.student_id = profiles.user_id
  )
);