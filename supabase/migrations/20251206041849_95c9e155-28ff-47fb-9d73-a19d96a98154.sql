-- Add column to track current active session
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_session_id text;

-- Allow users to update their own session id
-- (The existing update policy already covers this since it uses auth.uid() = id)