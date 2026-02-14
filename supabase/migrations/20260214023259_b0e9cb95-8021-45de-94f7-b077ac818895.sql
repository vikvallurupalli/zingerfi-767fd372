
-- Drop all existing policies on feedback
DROP POLICY IF EXISTS "Superadmins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Superadmins can update feedback" ON public.feedback;

-- Recreate as explicitly PERMISSIVE
CREATE POLICY "Superadmins can view all feedback"
ON public.feedback
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view their own feedback"
ON public.feedback
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON public.feedback
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can update feedback"
ON public.feedback
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));
