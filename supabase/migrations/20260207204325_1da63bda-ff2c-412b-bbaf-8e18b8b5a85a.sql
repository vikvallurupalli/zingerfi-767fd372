
-- FastEncrypt keypairs table (private key only accessible via service role / security definer)
CREATE TABLE public.fast_encrypt_keypairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.fast_encrypt_keypairs ENABLE ROW LEVEL SECURITY;
-- No RLS policies = no direct client access. Only service role and security definer functions can access.

-- Security definer function to safely return only the public key
CREATE OR REPLACE FUNCTION public.get_active_fast_encrypt_public_key()
RETURNS TABLE(keypair_id UUID, version INTEGER, public_key TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id AS keypair_id, version, public_key
  FROM public.fast_encrypt_keypairs
  WHERE is_active = true
  ORDER BY version DESC
  LIMIT 1
$$;

-- FastEncrypt messages tracking table (NO actual message content stored)
CREATE TABLE public.fast_encrypt_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_uid TEXT NOT NULL UNIQUE,
  sender_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  keypair_id UUID NOT NULL REFERENCES public.fast_encrypt_keypairs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_decrypted BOOLEAN NOT NULL DEFAULT false,
  decrypted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.fast_encrypt_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view their messages"
ON public.fast_encrypt_messages
FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Recipients can view their messages"
ON public.fast_encrypt_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND email = fast_encrypt_messages.recipient_email
  )
);

CREATE POLICY "Senders can insert messages"
ON public.fast_encrypt_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- FastEncrypt contacts table (saved recipient email/name associations)
CREATE TABLE public.fast_encrypt_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);

ALTER TABLE public.fast_encrypt_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts"
ON public.fast_encrypt_contacts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
ON public.fast_encrypt_contacts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
ON public.fast_encrypt_contacts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
ON public.fast_encrypt_contacts
FOR DELETE
USING (auth.uid() = user_id);
