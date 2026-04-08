
-- Drop the old trigger and function that used app.settings
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;
DROP FUNCTION IF EXISTS public.notify_push_on_insert();

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate function using direct URL
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _service_key text;
  _url text;
BEGIN
  -- Use the known project URL
  _url := 'https://mbqyazbcmpebnvcanmul.supabase.co/functions/v1/send-push';
  
  -- Get service role key from vault or use the known one
  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF _service_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.description,
      'url', COALESCE(NEW.action_url, '/notifications'),
      'notification_id', NEW.id
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block notification creation if push fails
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_notification_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_push_on_insert();
