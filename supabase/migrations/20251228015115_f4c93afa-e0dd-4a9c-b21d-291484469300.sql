-- Add duration_seconds column to videos table
ALTER TABLE public.videos ADD COLUMN duration_seconds integer DEFAULT NULL;

-- Add index for efficient duration-based filtering
CREATE INDEX idx_videos_duration ON public.videos (duration_seconds);
CREATE INDEX idx_videos_is_public_duration ON public.videos (is_public, duration_seconds);