
-- Drop the existing check constraint on status and add a new one that includes 'moved_out'
DO $$
BEGIN
  -- Find and drop any check constraint on room_assignments.status
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'room_assignments' AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.room_assignments DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'room_assignments' AND tc.constraint_type = 'CHECK'
      AND cc.check_clause LIKE '%status%'
      LIMIT 1
    );
  END IF;
END $$;

-- Add updated constraint allowing moved_out
ALTER TABLE public.room_assignments ADD CONSTRAINT room_assignments_status_check
  CHECK (status IN ('active', 'inactive', 'moved_out', 'reserved'));
