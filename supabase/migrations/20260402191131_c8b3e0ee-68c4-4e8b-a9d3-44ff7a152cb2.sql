
-- Trigger: notify landlord when a new complaint is created
CREATE OR REPLACE FUNCTION public.notify_landlord_new_complaint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.landlord_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
    VALUES (
      NEW.landlord_id,
      'complaint',
      'New Complaint',
      'A tenant has submitted a new complaint: ' || NEW.title,
      NEW.id,
      'complaint'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_complaint
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_landlord_new_complaint();

-- Trigger: notify tenants when announcement is created
CREATE OR REPLACE FUNCTION public.notify_tenants_new_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
BEGIN
  -- Find all active tenants for the property/room
  FOR v_student IN
    SELECT DISTINCT ra.student_id
    FROM public.room_assignments ra
    JOIN public.rooms r ON ra.room_id = r.id
    WHERE ra.status = 'active'
      AND r.property_id = NEW.property_id
      AND (NEW.room_id IS NULL OR ra.room_id = NEW.room_id)
  LOOP
    INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
    VALUES (
      v_student.student_id,
      'announcement',
      'New Announcement',
      NEW.title,
      NEW.id,
      'announcement'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_announcement
  AFTER INSERT ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tenants_new_announcement();

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
