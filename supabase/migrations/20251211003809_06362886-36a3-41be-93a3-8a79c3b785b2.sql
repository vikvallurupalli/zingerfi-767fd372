-- Create table to track decrypted messages (one-time use)
CREATE TABLE public.decrypted_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_hash TEXT NOT NULL UNIQUE,
  decrypted_by UUID NOT NULL,
  decrypted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decrypted_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own decryption records
CREATE POLICY "Users can insert their own decryption records"
ON public.decrypted_messages
FOR INSERT
WITH CHECK (auth.uid() = decrypted_by);

-- Users can check if a message was already decrypted (by anyone)
CREATE POLICY "Users can view all decryption records"
ON public.decrypted_messages
FOR SELECT
USING (true);

-- Create index for fast lookups
CREATE INDEX idx_decrypted_messages_hash ON public.decrypted_messages(message_hash);