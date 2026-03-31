
CREATE POLICY "Students can update their own complaints"
ON public.complaints FOR UPDATE TO public
USING (auth.uid() = student_id);
