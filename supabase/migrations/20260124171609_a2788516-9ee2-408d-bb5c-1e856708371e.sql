-- Create a function to unregister a user and clean up all related data
-- Only superadmins can call this function
CREATE OR REPLACE FUNCTION public.unregister_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is a superadmin
  IF NOT has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can unregister users';
  END IF;
  
  -- Delete from decrypted_messages
  DELETE FROM decrypted_messages WHERE decrypted_by = target_user_id;
  
  -- Delete from confide_unlocks
  DELETE FROM confide_unlocks WHERE user_id = target_user_id;
  
  -- Delete from confides (both directions)
  DELETE FROM confides WHERE user_id = target_user_id OR confide_user_id = target_user_id;
  
  -- Delete from confide_requests (both directions)
  DELETE FROM confide_requests WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  
  -- Delete from user_roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- Delete from profiles
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Finally delete from auth.users (this will cascade if needed)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;