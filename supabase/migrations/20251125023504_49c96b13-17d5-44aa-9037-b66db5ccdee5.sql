-- Create function to delete confide relationship for both users
CREATE OR REPLACE FUNCTION public.delete_confide(confide_user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete confide for current user -> confide_user
  DELETE FROM confides
  WHERE user_id = auth.uid() AND confide_user_id = confide_user_id_param;

  -- Delete confide for confide_user -> current user
  DELETE FROM confides
  WHERE user_id = confide_user_id_param AND confide_user_id = auth.uid();
END;
$$;