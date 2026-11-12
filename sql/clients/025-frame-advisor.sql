BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_frame_advice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES oc_client_user(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  result jsonb,
  failed_at timestamptz,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  feedback text CHECK (char_length(feedback) <= 2400),
  rated_at timestamptz,
  UNIQUE (user_id, request_id),
  CHECK (failed_at IS NULL OR result IS NULL),
  CHECK ((rating IS NULL) = (rated_at IS NULL)),
  CHECK (rating IS NULL OR result IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS oc_client_frame_advice_user_created_idx
  ON oc_client_frame_advice (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS oc_client_frame_advice_created_idx
  ON oc_client_frame_advice (created_at DESC);
CREATE INDEX IF NOT EXISTS oc_client_frame_advice_rated_idx
  ON oc_client_frame_advice (rated_at DESC) WHERE rated_at IS NOT NULL;
-- Independent counter preserves the shared spend cap even if a customer is deleted.
CREATE TABLE IF NOT EXISTS oc_client_frame_budget (
  month date PRIMARY KEY,
  used integer NOT NULL CHECK (used >= 0)
);
CREATE TABLE IF NOT EXISTS oc_client_frame_pilot (
  user_id text PRIMARY KEY REFERENCES oc_client_user(id) ON DELETE CASCADE
);
COMMIT;
