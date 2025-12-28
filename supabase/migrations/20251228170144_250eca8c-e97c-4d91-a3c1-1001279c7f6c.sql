-- Fix 1: User roles - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 2: Banned users - restrict to admins and owners only (and the user checking their own status)
DROP POLICY IF EXISTS "Anyone can check if user is banned" ON public.banned_users;
CREATE POLICY "Users can check own ban status" 
ON public.banned_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can view all bans" 
ON public.banned_users 
FOR SELECT 
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Comments - only show comments on public content or user's own content
DROP POLICY IF EXISTS "Anyone can view comments on public content" ON public.comments;
CREATE POLICY "View comments on public content" 
ON public.comments 
FOR SELECT 
USING (
  -- Comment on a public video
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.videos WHERE id = video_id AND is_public = true
  ))
  OR
  -- Comment on a public image
  (image_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.images WHERE id = image_id AND is_public = true
  ))
  OR
  -- User's own comment
  auth.uid() = user_id
  OR
  -- User owns the content being commented on
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.videos WHERE id = video_id AND user_id = auth.uid()
  ))
  OR
  (image_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.images WHERE id = image_id AND user_id = auth.uid()
  ))
);

-- Fix 4: Notifications - restrict INSERT to triggers only (remove public insert)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
-- Notifications will only be created by database triggers with SECURITY DEFINER

-- Fix 5: Follows - require authentication to view
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
CREATE POLICY "Authenticated users can view follows" 
ON public.follows 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 6: Likes - require authentication to view
DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
CREATE POLICY "Authenticated users can view likes" 
ON public.likes 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 7: Verified users - require authentication to view
DROP POLICY IF EXISTS "Anyone can view verified status" ON public.verified_users;
CREATE POLICY "Authenticated users can view verified status" 
ON public.verified_users 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 8: Reports - let users view their own reports
CREATE POLICY "Users can view own reports" 
ON public.reports 
FOR SELECT 
USING (auth.uid() = reporter_id);