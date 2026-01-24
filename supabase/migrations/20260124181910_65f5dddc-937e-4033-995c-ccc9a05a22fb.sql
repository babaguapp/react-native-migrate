-- Funkcja HTTP do wywołania Edge Function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get the Supabase URL and service role key from environment
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification';
  
  -- Use pg_net to call the edge function asynchronously
  PERFORM net.http_post(
    url := 'https://jqaghjzyafrfrtsycwci.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'data', jsonb_build_object(
        'type', NEW.type,
        'meeting_id', NEW.meeting_id,
        'related_user_id', NEW.related_user_id,
        'notification_id', NEW.id
      )
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger na tabeli notifications
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();