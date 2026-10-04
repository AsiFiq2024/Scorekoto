ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_otp_challenge (
  challenge_id UUID PRIMARY KEY,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('registration', 'recovery')),
  email VARCHAR(320) NOT NULL,
  otp_digest CHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_key CHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  send_count SMALLINT NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMPTZ,
  recovery_token_digest CHAR(64),
  recovery_token_expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_email_created
  ON auth_otp_challenge (LOWER(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_otp_expiry
  ON auth_otp_challenge (expires_at);
