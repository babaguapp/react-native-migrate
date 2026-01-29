-- Add phone verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Create table for SMS verification codes
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on phone_verification_codes
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can only view their own verification codes
CREATE POLICY "Users can view own verification codes"
ON public.phone_verification_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own verification codes
CREATE POLICY "Users can insert own verification codes"
ON public.phone_verification_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification codes  
CREATE POLICY "Users can update own verification codes"
ON public.phone_verification_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own verification codes
CREATE POLICY "Users can delete own verification codes"
ON public.phone_verification_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_verification_user_id ON public.phone_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone ON public.phone_verification_codes(phone_number);

-- Update profiles RLS to allow updating phone columns
-- (existing policy already allows users to update their own profile)