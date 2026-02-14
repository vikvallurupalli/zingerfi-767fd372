
-- Drop restrictive SELECT policies on feedback
DROP POLICY IF EXISTS "Superadmins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Superadmins can update feedback" ON public.feedback;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Superadmins can view all feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view their own feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON public.feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can update feedback"
ON public.feedback FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));
