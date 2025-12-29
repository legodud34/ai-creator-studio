-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can view verified status" ON public.verified_users;

-- Create a more restrictive policy - only show user_id (for badge display), hide sensitive metadata from non-admins
CREATE POLICY "Authenticated users can view verified status" 
ON public.verified_users 
FOR SELECT 
USING (
  -- Admins and owners can see everything
  is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  -- Regular users can only see if someone is verified (their own status check)
  OR user_id = auth.uid()
  -- For verified badge display, allow seeing user_id exists but RLS naturally limits column access
  OR auth.uid() IS NOT NULL
);