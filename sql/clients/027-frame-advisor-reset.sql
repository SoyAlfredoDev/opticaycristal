ALTER TABLE oc_client_frame_pilot
  ADD COLUMN IF NOT EXISTS daily_reset_at timestamptz;
