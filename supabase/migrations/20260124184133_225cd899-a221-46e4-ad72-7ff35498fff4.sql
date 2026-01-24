-- Table to store muted meetings per user
CREATE TABLE public.muted_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, meeting_id)
);

-- Enable RLS
ALTER TABLE public.muted_meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own muted meetings" 
ON public.muted_meetings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can mute meetings" 
ON public.muted_meetings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmute meetings" 
ON public.muted_meetings FOR DELETE 
USING (auth.uid() = user_id);

-- Update the notify_new_chat_message function to respect muted meetings
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
  activity_name TEXT;
BEGIN
  -- Get sender's name
  SELECT full_name INTO sender_name 
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Get activity name for the meeting
  SELECT a.name INTO activity_name
  FROM public.meetings m
  JOIN public.activities a ON a.id = m.activity_id
  WHERE m.id = NEW.meeting_id;
  
  -- For each participant (organizer + accepted participants)
  FOR participant IN (
    SELECT DISTINCT p.user_id 
    FROM (
      -- Meeting creator
      SELECT creator_id as user_id FROM public.meetings WHERE id = NEW.meeting_id
      UNION
      -- Accepted participants
      SELECT user_id FROM public.meeting_participants 
      WHERE meeting_id = NEW.meeting_id AND status = 'accepted'
    ) AS p
    WHERE p.user_id != NEW.user_id  -- Don't send to message author
    AND p.user_id NOT IN (          -- Don't send if user is active in chat
      SELECT ucp.user_id FROM public.user_chat_presence ucp
      WHERE ucp.meeting_id = NEW.meeting_id 
      AND ucp.last_active_at > now() - interval '30 seconds'
    )
    AND p.user_id NOT IN (          -- Don't send if user has muted the meeting
      SELECT mm.user_id FROM public.muted_meetings mm
      WHERE mm.meeting_id = NEW.meeting_id
    )
  ) LOOP
    -- Create notification
    PERFORM public.create_notification(
      participant.user_id,
      'new_message',
      'Nowa wiadomość w czacie',
      COALESCE(sender_name, 'Ktoś') || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
      NEW.meeting_id,
      NEW.user_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;