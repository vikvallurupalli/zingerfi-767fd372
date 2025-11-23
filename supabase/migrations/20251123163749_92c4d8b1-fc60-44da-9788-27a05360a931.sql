-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  public_key text NOT NULL,
  encrypted_private_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create confides table
CREATE TABLE public.confides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  confide_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  alias text,
  status text DEFAULT 'accepted' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, confide_user_id)
);

-- Enable RLS
ALTER TABLE public.confides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for confides
CREATE POLICY "Users can view their own confides"
  ON public.confides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own confides"
  ON public.confides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own confides"
  ON public.confides FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own confides"
  ON public.confides FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create confide_requests table
CREATE TABLE public.confide_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.confide_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for confide_requests
CREATE POLICY "Users can view requests they sent"
  ON public.confide_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can view requests they received"
  ON public.confide_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can insert their own requests"
  ON public.confide_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
  ON public.confide_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete requests they sent"
  ON public.confide_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, public_key, encrypted_private_key)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    ''
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();