-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- Create a more secure insert policy - notifications are inserted via edge function with service role
-- We'll use a database function instead
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_meeting_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, meeting_id, related_user_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_meeting_id, p_related_user_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;