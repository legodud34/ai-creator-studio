-- Add genre column to videos table
ALTER TABLE public.videos 
ADD COLUMN genre text;

-- Create index for genre-based filtering
CREATE INDEX idx_videos_genre ON public.videos(genre);

-- Update existing videos to have null genre (will be detected on new generations)
COMMENT ON COLUMN public.videos.genre IS 'Video genre: Action, Comedy, Drama, Horror, Sci-Fi, Nature, Travel, Sports, Tech, Art';