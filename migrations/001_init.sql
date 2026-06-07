CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(200) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  token        VARCHAR(64) UNIQUE NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assessments_token  ON assessments(token);
CREATE INDEX IF NOT EXISTS idx_assessments_user   ON assessments(user_id);

CREATE TABLE IF NOT EXISTS responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID REFERENCES assessments(id) ON DELETE CASCADE,
  question_index  INTEGER NOT NULL,
  most_dim        CHAR(1) NOT NULL CHECK (most_dim  IN ('D','I','S','C')),
  least_dim       CHAR(1) NOT NULL CHECK (least_dim IN ('D','I','S','C')),
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_assessment ON responses(assessment_id);

CREATE TABLE IF NOT EXISTS results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID REFERENCES assessments(id) ON DELETE CASCADE UNIQUE,
  g1_d INTEGER, g1_i INTEGER, g1_s INTEGER, g1_c INTEGER,
  g2_d INTEGER, g2_i INTEGER, g2_s INTEGER, g2_c INTEGER,
  g3_d INTEGER, g3_i INTEGER, g3_s INTEGER, g3_c INTEGER,
  primary_style   CHAR(1),
  secondary_style CHAR(1),
  computed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- status: pending | queued | completed | failed
-- 'queued' = waiting for admin approval (triggered when total completed >= AI_REPORT_LIMIT)
CREATE TABLE IF NOT EXISTS ai_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID REFERENCES assessments(id) ON DELETE CASCADE UNIQUE,
  report_json    JSONB,
  model_used     VARCHAR(100),
  status         VARCHAR(20) DEFAULT 'pending',
  queued_at      TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  generated_at   TIMESTAMPTZ,
  email_sent     BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_status ON ai_reports(status);
