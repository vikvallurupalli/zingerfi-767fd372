-- Add sender_alias column to confide_requests table
ALTER TABLE confide_requests
ADD COLUMN sender_alias TEXT;

-- Update the accept_confide_request function to handle aliases
CREATE OR REPLACE FUNCTION public.accept_confide_request(request_id uuid, receiver_alias text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid;
  v_receiver_id uuid;
  v_sender_alias text;
BEGIN
  -- Get sender, receiver, and sender_alias from the request
  SELECT sender_id, receiver_id, sender_alias
  INTO v_sender_id, v_receiver_id, v_sender_alias
  FROM confide_requests
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';

  -- Check if request exists and user is authorized
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or unauthorized';
  END IF;

  -- Create bidirectional confide relationships
  -- Insert confide for receiver -> sender (receiver's view, uses receiver's chosen alias for sender)
  INSERT INTO confides (user_id, confide_user_id, status, alias)
  VALUES (v_receiver_id, v_sender_id, 'accepted', receiver_alias)
  ON CONFLICT (user_id, confide_user_id) DO UPDATE SET alias = receiver_alias;

  -- Insert confide for sender -> receiver (sender's view, uses sender's chosen alias for receiver)
  INSERT INTO confides (user_id, confide_user_id, status, alias)
  VALUES (v_sender_id, v_receiver_id, 'accepted', v_sender_alias)
  ON CONFLICT (user_id, confide_user_id) DO UPDATE SET alias = v_sender_alias;

  -- Delete the request after acceptance
  DELETE FROM confide_requests WHERE id = request_id;
END;
$function$;