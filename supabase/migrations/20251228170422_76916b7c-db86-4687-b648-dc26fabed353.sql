-- Fix 1: Follows - restrict to users who are part of the relationship or viewing their own profile's followers
DROP POLICY IF EXISTS "Authenticated users can view follows" ON public.follows;
CREATE POLICY "Users can view relevant follows" 
ON public.follows 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = follower_id OR 
  auth.uid() = following_id
);

-- Fix 2: Likes - restrict to viewing likes on public content, own content, or own likes
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.likes;
CREATE POLICY "Users can view relevant likes" 
ON public.likes 
FOR SELECT 
TO authenticated
USING (
  -- User's own likes
  auth.uid() = user_id
  OR
  -- Likes on public videos
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.videos WHERE id = video_id AND is_public = true
  ))
  OR
  -- Likes on public images
  (image_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.images WHERE id = image_id AND is_public = true
  ))
  OR
  -- Likes on user's own content
  (video_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.videos WHERE id = video_id AND user_id = auth.uid()
  ))
  OR
  (image_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.images WHERE id = image_id AND user_id = auth.uid()
  ))
);

-- Fix 3: Reports - remove ability for reporters to see full report details (just status)
-- Actually, let's keep it simple and remove user access to reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;

-- Fix 4: Add UPDATE policy for banned_users so admins can modify bans
CREATE POLICY "Admins and owners can update bans" 
ON public.banned_users 
FOR UPDATE 
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 5: Add DELETE policy for reports so admins can clean up
CREATE POLICY "Admins and owners can delete reports" 
ON public.reports 
FOR DELETE 
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));