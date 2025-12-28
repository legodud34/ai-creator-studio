-- Create function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'
  )
$$;

-- Update RLS policies to allow owners to manage roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Owners can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owners can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_owner(auth.uid()));

CREATE POLICY "Owners can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_owner(auth.uid()));

-- Also allow owners to verify users
DROP POLICY IF EXISTS "Admins can verify users" ON public.verified_users;
DROP POLICY IF EXISTS "Admins can remove verification" ON public.verified_users;

CREATE POLICY "Owners and admins can verify users"
ON public.verified_users
FOR INSERT
WITH CHECK (public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can remove verification"
ON public.verified_users
FOR DELETE
USING (public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Allow owners to view and manage reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

CREATE POLICY "Owners and admins can view all reports"
ON public.reports
FOR SELECT
USING (public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can update reports"
ON public.reports
FOR UPDATE
USING (public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Allow owners to ban/unban users
DROP POLICY IF EXISTS "Admins can ban users" ON public.banned_users;
DROP POLICY IF EXISTS "Admins can unban users" ON public.banned_users;

CREATE POLICY "Owners and admins can ban users"
ON public.banned_users
FOR INSERT
WITH CHECK (public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can unban users"
ON public.banned_users
FOR DELETE
USING (public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));