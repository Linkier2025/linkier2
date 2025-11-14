-- Fix search_path for all notification functions
CREATE OR REPLACE FUNCTION public.notify_landlord_rental_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
  VALUES (
    NEW.landlord_id,
    'rental_request',
    'New Rental Request',
    'You have received a new rental request',
    NEW.id,
    'rental_request'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_student_rental_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
    VALUES (
      NEW.student_id,
      'rental_response',
      CASE WHEN NEW.status = 'approved' THEN 'Rental Request Approved' ELSE 'Rental Request Update' END,
      CASE WHEN NEW.status = 'approved' THEN 'Your rental request has been approved!' ELSE 'Your rental request status has been updated' END,
      NEW.id,
      'rental_request'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_landlord_viewing_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
  VALUES (
    NEW.landlord_id,
    'viewing_request',
    'New Viewing Request',
    'You have received a new property viewing request',
    NEW.id,
    'viewing_request'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_student_viewing_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
    VALUES (
      NEW.student_id,
      'viewing_response',
      CASE WHEN NEW.status = 'approved' THEN 'Viewing Request Approved' ELSE 'Viewing Request Update' END,
      CASE WHEN NEW.status = 'approved' THEN 'Your viewing request has been approved!' ELSE 'Your viewing request status has been updated' END,
      NEW.id,
      'viewing_request'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, description, related_id, related_type)
  VALUES (
    NEW.receiver_id,
    'message',
    'New Message',
    'You have received a new message',
    NEW.id,
    'message'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;