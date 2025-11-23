-- Create a secure function to accept confide requests
CREATE OR REPLACE FUNCTION public.accept_confide_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid;
  v_receiver_id uuid;
BEGIN
  -- Get sender and receiver from the request
  SELECT sender_id, receiver_id 
  INTO v_sender_id, v_receiver_id
  FROM confide_requests
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';

  -- Check if request exists and user is authorized
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or unauthorized';
  END IF;

  -- Create bidirectional confide relationships
  -- Insert confide for receiver -> sender
  INSERT INTO confides (user_id, confide_user_id, status)
  VALUES (v_receiver_id, v_sender_id, 'accepted')
  ON CONFLICT (user_id, confide_user_id) DO NOTHING;

  -- Insert confide for sender -> receiver
  INSERT INTO confides (user_id, confide_user_id, status)
  VALUES (v_sender_id, v_receiver_id, 'accepted')
  ON CONFLICT (user_id, confide_user_id) DO NOTHING;

  -- Update request status
  UPDATE confide_requests
  SET status = 'accepted'
  WHERE id = request_id;
END;
$$;