-- Fix 1: Profiles - require authentication to view (still allows public content to show creator info)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 2: User roles - restrict to only viewing own role or admins/owners can view all
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
CREATE POLICY "Users can view own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Comments - add UPDATE policy so users can edit their own comments
CREATE POLICY "Users can update own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Note: Notifications INSERT was removed because triggers use SECURITY DEFINER
-- The triggers (handle_like_notification, handle_comment_notification, handle_follow_notification) 
-- already have SECURITY DEFINER which bypasses RLS, so they can still insert