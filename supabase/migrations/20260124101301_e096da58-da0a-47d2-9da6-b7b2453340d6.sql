-- Create profiles table with user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  birth_date DATE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table (subcategories)
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE RESTRICT,
  city TEXT NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL CHECK (max_participants >= 2),
  gender_preference TEXT NOT NULL CHECK (gender_preference IN ('male', 'female', 'mixed')),
  description TEXT,
  image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting_participants table
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Categories policies (read-only for all authenticated users)
CREATE POLICY "Categories are viewable by authenticated users" 
ON public.categories FOR SELECT 
TO authenticated
USING (true);

-- Activities policies (read-only for all authenticated users)
CREATE POLICY "Activities are viewable by authenticated users" 
ON public.activities FOR SELECT 
TO authenticated
USING (true);

-- Meetings policies
CREATE POLICY "Meetings are viewable by authenticated users" 
ON public.meetings FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create meetings" 
ON public.meetings FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their meetings" 
ON public.meetings FOR UPDATE 
TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their meetings" 
ON public.meetings FOR DELETE 
TO authenticated
USING (auth.uid() = creator_id);

-- Meeting participants policies
CREATE POLICY "Meeting participants are viewable by authenticated users" 
ON public.meeting_participants FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can join meetings" 
ON public.meeting_participants FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can manage participants" 
ON public.meeting_participants FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND meetings.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can leave meetings" 
ON public.meeting_participants FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, icon) VALUES
  ('Impreza', 'party-popper'),
  ('Sport', 'dumbbell'),
  ('Kultura', 'palette'),
  ('Jedzenie', 'utensils'),
  ('Podróże', 'plane'),
  ('Rozrywka', 'gamepad-2'),
  ('Nauka', 'book-open'),
  ('Inne', 'more-horizontal');

-- Insert sample activities for each category
INSERT INTO public.activities (category_id, name) 
SELECT c.id, a.name
FROM public.categories c
CROSS JOIN (
  VALUES 
    ('Impreza', 'Wyjście do klubu'),
    ('Impreza', 'Wyjście do baru'),
    ('Impreza', 'Domówka'),
    ('Impreza', 'Koncert'),
    ('Sport', 'Siłownia'),
    ('Sport', 'Bieganie'),
    ('Sport', 'Jazda na rowerze'),
    ('Sport', 'Piłka nożna'),
    ('Sport', 'Koszykówka'),
    ('Sport', 'Tenis'),
    ('Kultura', 'Kino'),
    ('Kultura', 'Teatr'),
    ('Kultura', 'Wystawa'),
    ('Kultura', 'Muzeum'),
    ('Kultura', 'Wernisaż'),
    ('Jedzenie', 'Restauracja'),
    ('Jedzenie', 'Kawiarnia'),
    ('Jedzenie', 'Street food'),
    ('Podróże', 'Wycieczka'),
    ('Podróże', 'Weekend za miastem'),
    ('Rozrywka', 'Gry planszowe'),
    ('Rozrywka', 'Escape room'),
    ('Rozrywka', 'Bowling'),
    ('Nauka', 'Warsztaty'),
    ('Nauka', 'Kurs językowy'),
    ('Inne', 'Spacer')
) AS a(category_name, name)
WHERE c.name = a.category_name;