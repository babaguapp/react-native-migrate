-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_meeting_id ON public.chat_messages(meeting_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is participant or creator of meeting
CREATE OR REPLACE FUNCTION public.is_meeting_member(_user_id UUID, _meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE id = _meeting_id AND creator_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.meeting_participants 
    WHERE meeting_id = _meeting_id AND user_id = _user_id AND status = 'confirmed'
  )
$$;

-- RLS Policies
-- Only meeting members can view messages
CREATE POLICY "Meeting members can view messages"
ON public.chat_messages
FOR SELECT
USING (public.is_meeting_member(auth.uid(), meeting_id));

-- Only meeting members can send messages
CREATE POLICY "Meeting members can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_meeting_member(auth.uid(), meeting_id)
);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;