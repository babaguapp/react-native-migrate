-- Update is_meeting_member function to use 'accepted' status instead of 'confirmed'
CREATE OR REPLACE FUNCTION public.is_meeting_member(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE id = _meeting_id AND creator_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.meeting_participants 
    WHERE meeting_id = _meeting_id AND user_id = _user_id AND status = 'accepted'
  )
$$;