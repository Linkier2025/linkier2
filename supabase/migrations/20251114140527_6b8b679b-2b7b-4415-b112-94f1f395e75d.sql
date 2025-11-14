-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  related_id uuid,
  related_type text,
  action_url text
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (we'll use service role or triggers)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create notifications for new rental requests
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for rental requests
CREATE TRIGGER on_rental_request_created
AFTER INSERT ON public.rental_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_landlord_rental_request();

-- Create function to notify students when landlord responds to rental request
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for rental request updates
CREATE TRIGGER on_rental_request_updated
AFTER UPDATE ON public.rental_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_rental_response();

-- Create function to notify landlord of viewing requests
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for viewing requests
CREATE TRIGGER on_viewing_request_created
AFTER INSERT ON public.property_viewings
FOR EACH ROW
EXECUTE FUNCTION public.notify_landlord_viewing_request();

-- Create function to notify students when viewing request is updated
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for viewing request updates
CREATE TRIGGER on_viewing_request_updated
AFTER UPDATE ON public.property_viewings
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_viewing_response();

-- Create function to notify on new messages
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();