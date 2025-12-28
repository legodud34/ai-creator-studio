-- Create reports table for user reports
CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_type text NOT NULL CHECK (content_type IN ('image', 'video', 'profile', 'comment')),
    content_id uuid,
    reason text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create banned_users table
CREATE TABLE public.banned_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    reason text NOT NULL,
    banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    banned_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone
);

-- Enable RLS on banned_users
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for banned_users
CREATE POLICY "Anyone can check if user is banned"
ON public.banned_users
FOR SELECT
USING (true);

CREATE POLICY "Admins can ban users"
ON public.banned_users
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can unban users"
ON public.banned_users
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));