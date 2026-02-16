
-- Create table to track FastEncrypt message pack unlocks
CREATE TABLE public.fast_encrypt_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fast_encrypt_unlocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own unlocks
CREATE POLICY "Users can view their own unlocks"
ON public.fast_encrypt_unlocks
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own unlocks
CREATE POLICY "Users can insert their own unlocks"
ON public.fast_encrypt_unlocks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Prevent duplicate payments for the same cycle
CREATE UNIQUE INDEX idx_fast_encrypt_unlocks_user_cycle ON public.fast_encrypt_unlocks (user_id, cycle_number);
