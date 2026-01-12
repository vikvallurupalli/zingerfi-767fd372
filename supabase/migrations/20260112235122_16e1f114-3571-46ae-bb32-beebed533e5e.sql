-- Record successful one-time payments that unlock adding additional confides
CREATE TABLE IF NOT EXISTS public.confide_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_confide_unlocks_user_id ON public.confide_unlocks (user_id);

ALTER TABLE public.confide_unlocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own unlock records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'confide_unlocks'
      AND policyname = 'Users can view their own confide unlocks'
  ) THEN
    CREATE POLICY "Users can view their own confide unlocks"
    ON public.confide_unlocks
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own unlock record (typically via backend function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'confide_unlocks'
      AND policyname = 'Users can insert their own confide unlocks'
  ) THEN
    CREATE POLICY "Users can insert their own confide unlocks"
    ON public.confide_unlocks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;