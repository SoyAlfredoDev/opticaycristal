BEGIN;
-- No original photos are persisted. Output is encrypted and inaccessible after expiry.
CREATE TABLE IF NOT EXISTS oc_client_frame_image (
  advice_id uuid NOT NULL REFERENCES oc_client_frame_advice(id) ON DELETE CASCADE,
  option_index smallint NOT NULL CHECK (option_index BETWEEN 0 AND 2),
  photo_fingerprint text NOT NULL,
  consent_version text NOT NULL DEFAULT 'photo-edit-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','ready','failed','expired')),
  image_encrypted text,
  PRIMARY KEY (advice_id, option_index),
  CHECK ((state = 'ready') = (image_encrypted IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS oc_client_frame_image_expiry_idx ON oc_client_frame_image(expires_at) WHERE image_encrypted IS NOT NULL;
CREATE TABLE IF NOT EXISTS oc_client_frame_image_budget (
  month date PRIMARY KEY,
  used integer NOT NULL CHECK (used >= 0)
);
COMMIT;
