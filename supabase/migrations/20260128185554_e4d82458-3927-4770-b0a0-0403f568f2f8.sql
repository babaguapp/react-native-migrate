-- Add address column to meetings table for precise location storage
ALTER TABLE public.meetings 
ADD COLUMN address TEXT;