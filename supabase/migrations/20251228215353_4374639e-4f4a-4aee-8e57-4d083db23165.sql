-- Create admin genre assignments table
CREATE TABLE public.admin_genre_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  genre text NOT NULL,
  assigned_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, genre)
);

-- Enable RLS
ALTER TABLE public.admin_genre_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Owners can create admin genre assignments"
ON public.admin_genre_assignments
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Owners can delete admin genre assignments"
ON public.admin_genre_assignments
FOR DELETE
USING (is_owner(auth.uid()));

CREATE POLICY "Owners and admins can view admin genre assignments"
ON public.admin_genre_assignments
FOR SELECT
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Create function to get admin's genre
CREATE OR REPLACE FUNCTION public.get_admin_genre(_admin_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT genre FROM public.admin_genre_assignments
  WHERE admin_user_id = _admin_id
  LIMIT 1
$$;

-- Create function to check if moderator can access a genre (through their admin)
CREATE OR REPLACE FUNCTION public.mod_can_access_genre(_user_id uuid, _genre text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.moderator_admin_assignments ma
    JOIN public.admin_genre_assignments ag ON ag.admin_user_id = ma.admin_user_id
    WHERE ma.moderator_user_id = _user_id
      AND ag.genre = _genre
  )
$$;

-- Update moderator report policy to use admin's genre
DROP POLICY IF EXISTS "Moderators can view reports in their genre" ON public.reports;
CREATE POLICY "Moderators can view reports in their genre"
ON public.reports
FOR SELECT
USING (
  has_role(auth.uid(), 'moderator') 
  AND genre IS NOT NULL 
  AND mod_can_access_genre(auth.uid(), genre)
);

DROP POLICY IF EXISTS "Moderators can update reports in their genre" ON public.reports;
CREATE POLICY "Moderators can update reports in their genre"
ON public.reports
FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator')
  AND genre IS NOT NULL
  AND mod_can_access_genre(auth.uid(), genre)
);