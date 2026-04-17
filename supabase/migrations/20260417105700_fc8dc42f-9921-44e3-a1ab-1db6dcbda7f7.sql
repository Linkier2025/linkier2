
-- Sync rooms.renovation_status with the renovations table automatically.
-- A room is "under_renovation" only if it has at least one renovation row
-- with status = 'in_progress' (and end_date in the future or null).

CREATE OR REPLACE FUNCTION public.sync_room_renovation_status(p_property_id uuid, p_room_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active RECORD;
BEGIN
  IF p_room_number IS NULL THEN RETURN; END IF;

  -- Find an active in-progress renovation for this room (end_date in future or null)
  SELECT title, description, start_date, end_date
  INTO v_active
  FROM public.renovations
  WHERE property_id = p_property_id
    AND room_number = p_room_number
    AND status = 'in_progress'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.rooms
    SET renovation_status = 'under_renovation',
        renovation_description = COALESCE(v_active.description, v_active.title),
        renovation_start_date = v_active.start_date,
        renovation_end_date = v_active.end_date,
        updated_at = NOW()
    WHERE property_id = p_property_id AND room_number = p_room_number;
  ELSE
    UPDATE public.rooms
    SET renovation_status = 'available',
        renovation_description = NULL,
        renovation_start_date = NULL,
        renovation_end_date = NULL,
        updated_at = NOW()
    WHERE property_id = p_property_id
      AND room_number = p_room_number
      AND renovation_status = 'under_renovation';
  END IF;
END;
$$;

-- Trigger function for renovations changes
CREATE OR REPLACE FUNCTION public.trg_sync_room_renovation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_room_renovation_status(OLD.property_id, OLD.room_number);
    RETURN OLD;
  ELSE
    -- If the room/property changed (rare), sync the OLD location too
    IF TG_OP = 'UPDATE' AND (OLD.property_id <> NEW.property_id OR COALESCE(OLD.room_number,'') <> COALESCE(NEW.room_number,'')) THEN
      PERFORM public.sync_room_renovation_status(OLD.property_id, OLD.room_number);
    END IF;
    PERFORM public.sync_room_renovation_status(NEW.property_id, NEW.room_number);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS sync_room_renovation_status_trigger ON public.renovations;
CREATE TRIGGER sync_room_renovation_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.renovations
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_room_renovation();

-- One-time backfill: reconcile every room with current renovations state
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT property_id, room_number FROM public.rooms WHERE room_number IS NOT NULL LOOP
    PERFORM public.sync_room_renovation_status(r.property_id, r.room_number);
  END LOOP;
END $$;

-- Auto-complete renovations whose end_date has passed
CREATE OR REPLACE FUNCTION public.auto_complete_renovations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.renovations
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'in_progress'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$;

-- Run once now to clean up stale data
SELECT public.auto_complete_renovations();
