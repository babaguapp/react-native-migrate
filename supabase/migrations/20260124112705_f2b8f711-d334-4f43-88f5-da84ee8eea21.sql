-- Create table to track last read message per user per meeting
CREATE TABLE public.chat_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, meeting_id)
);

-- Create index for faster queries
CREATE INDEX idx_chat_read_status_user_meeting ON public.chat_read_status(user_id, meeting_id);

-- Enable RLS
ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view own read status"
ON public.chat_read_status
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert own read status"
ON public.chat_read_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own read status
CREATE POLICY "Users can update own read status"
ON public.chat_read_status
FOR UPDATE
USING (auth.uid() = user_id);