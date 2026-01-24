-- Allow meeting creators to remove participants from their meetings
CREATE POLICY "Creators can remove participants"
ON public.meeting_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.meetings
    WHERE meetings.id = meeting_participants.meeting_id
    AND meetings.creator_id = auth.uid()
  )
);