-- Table for assigning moderators to specific genres
CREATE TABLE public.moderator_genre_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_user_id UUID NOT NULL,
  genre TEXT NOT NULL,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(moderator_user_id, genre)
);

-- Table for assigning moderators to report to specific admins
CREATE TABLE public.moderator_admin_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_user_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(moderator_user_id, admin_user_id)
);

-- Table for monthly reports from admins to owner
CREATE TABLE public.admin_monthly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  report_month INTEGER NOT NULL CHECK (report_month >= 1 AND report_month <= 12),
  report_year INTEGER NOT NULL,
  reports_resolved INTEGER NOT NULL DEFAULT 0,
  reports_dismissed INTEGER NOT NULL DEFAULT 0,
  reports_pending INTEGER NOT NULL DEFAULT 0,
  users_banned INTEGER NOT NULL DEFAULT 0,
  users_suspended INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, report_month, report_year)
);

-- Enable RLS on all tables
ALTER TABLE public.moderator_genre_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Policies for moderator_genre_assignments
CREATE POLICY "Owners and admins can view genre assignments"
ON public.moderator_genre_assignments
FOR SELECT
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can create genre assignments"
ON public.moderator_genre_assignments
FOR INSERT
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete genre assignments"
ON public.moderator_genre_assignments
FOR DELETE
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can view own genre assignments"
ON public.moderator_genre_assignments
FOR SELECT
USING (auth.uid() = moderator_user_id);

-- Policies for moderator_admin_assignments
CREATE POLICY "Owners can view all admin assignments"
ON public.moderator_admin_assignments
FOR SELECT
USING (is_owner(auth.uid()));

CREATE POLICY "Owners can create admin assignments"
ON public.moderator_admin_assignments
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Owners can delete admin assignments"
ON public.moderator_admin_assignments
FOR DELETE
USING (is_owner(auth.uid()));

CREATE POLICY "Admins can view their assigned mods"
ON public.moderator_admin_assignments
FOR SELECT
USING (auth.uid() = admin_user_id);

CREATE POLICY "Moderators can view their admin assignment"
ON public.moderator_admin_assignments
FOR SELECT
USING (auth.uid() = moderator_user_id);

-- Policies for admin_monthly_reports
CREATE POLICY "Owners can view all monthly reports"
ON public.admin_monthly_reports
FOR SELECT
USING (is_owner(auth.uid()));

CREATE POLICY "Admins can view own reports"
ON public.admin_monthly_reports
FOR SELECT
USING (auth.uid() = admin_user_id);

CREATE POLICY "Admins can create own reports"
ON public.admin_monthly_reports
FOR INSERT
WITH CHECK (auth.uid() = admin_user_id OR is_owner(auth.uid()));

CREATE POLICY "Admins can update own reports"
ON public.admin_monthly_reports
FOR UPDATE
USING (auth.uid() = admin_user_id OR is_owner(auth.uid()));

-- Add genre column to reports table if it doesn't exist (for genre-based mod assignments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'genre'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN genre TEXT;
  END IF;
END $$;