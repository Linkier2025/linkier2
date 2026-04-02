
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, property_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own wishlist"
  ON public.wishlists FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can add to wishlist"
  ON public.wishlists FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can remove from wishlist"
  ON public.wishlists FOR DELETE
  USING (auth.uid() = student_id);
