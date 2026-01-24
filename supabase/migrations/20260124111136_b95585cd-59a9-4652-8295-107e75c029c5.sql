-- Create storage bucket for user photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true);

-- RLS policies for user photos bucket
CREATE POLICY "Users can view all photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-photos');

CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table for user photos metadata
CREATE TABLE public.user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX idx_user_photos_user_id ON public.user_photos(user_id);

-- Enable RLS
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_photos
CREATE POLICY "Anyone can view photos"
ON public.user_photos
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own photos"
ON public.user_photos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
ON public.user_photos
FOR DELETE
USING (auth.uid() = user_id);