-- Add moderator tracking fields to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS moderator_id uuid,
ADD COLUMN IF NOT EXISTS escalation_notes text,
ADD COLUMN IF NOT EXISTS escalated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS escalated_to uuid;

-- Create index for moderator lookups
CREATE INDEX IF NOT EXISTS idx_reports_moderator_id ON public.reports(moderator_id);
CREATE INDEX IF NOT EXISTS idx_reports_genre ON public.reports(genre);

-- Create security definer function to check if user is moderator for a genre
CREATE OR REPLACE FUNCTION public.is_moderator_for_genre(_user_id uuid, _genre text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.moderator_genre_assignments
    WHERE moderator_user_id = _user_id
      AND genre = _genre
  )
$$;

-- Allow moderators to view reports in their assigned genres
CREATE POLICY "Moderators can view reports in their genre"
ON public.reports
FOR SELECT
USING (
  has_role(auth.uid(), 'moderator') 
  AND genre IS NOT NULL 
  AND is_moderator_for_genre(auth.uid(), genre)
);

-- Allow moderators to update reports in their genre (for escalation and initial review)
CREATE POLICY "Moderators can update reports in their genre"
ON public.reports
FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator')
  AND genre IS NOT NULL
  AND is_moderator_for_genre(auth.uid(), genre)
);