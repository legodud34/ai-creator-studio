-- Add title column to images table
ALTER TABLE public.images 
ADD COLUMN title TEXT;

-- Add title column to videos table
ALTER TABLE public.videos 
ADD COLUMN title TEXT;