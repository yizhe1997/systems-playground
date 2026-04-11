CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS trade_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument TEXT NOT NULL,
  session_date DATE NOT NULL,
  bias TEXT NOT NULL,
  entry_low NUMERIC(12,4) NOT NULL,
  entry_high NUMERIC(12,4) NOT NULL,
  stop_loss NUMERIC(12,4) NOT NULL,
  take_profit_1 NUMERIC(12,4) NOT NULL,
  take_profit_2 NUMERIC(12,4),
  take_profit_3 NUMERIC(12,4),
  scaling_plan JSONB,
  invalidation_notes TEXT,
  creator_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rubric_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version INT NOT NULL,
  approval_threshold INT NOT NULL DEFAULT 70,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version)
);

CREATE TABLE IF NOT EXISTS rubric_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rubric_version_id UUID NOT NULL REFERENCES rubric_versions(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  description TEXT NOT NULL,
  weight NUMERIC(8,4) NOT NULL,
  evaluation_type TEXT NOT NULL,
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rubric_version_id, rule_key)
);

CREATE TABLE IF NOT EXISTS ai_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_plan_id UUID NOT NULL REFERENCES trade_plans(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  overall_score INT NOT NULL,
  rule_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  public_explanation TEXT,
  creator_explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_user_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscriber_user_id)
);

CREATE TABLE IF NOT EXISTS alert_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_user_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  destination TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscriber_user_id, channel_type, destination)
);

CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_plan_id UUID NOT NULL REFERENCES trade_plans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  dispatch_mode TEXT NOT NULL,
  audience_scope TEXT NOT NULL DEFAULT 'paid',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_event_id UUID NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
  alert_channel_id UUID NOT NULL REFERENCES alert_channels(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_plan_id UUID NOT NULL REFERENCES trade_plans(id) ON DELETE CASCADE,
  entry_price NUMERIC(12,4) NOT NULL,
  exit_price NUMERIC(12,4) NOT NULL,
  position_size NUMERIC(14,4) NOT NULL,
  mae NUMERIC(12,4),
  mfe NUMERIC(12,4),
  creator_notes TEXT,
  closed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  equity NUMERIC(14,4) NOT NULL DEFAULT 0,
  daily_pnl NUMERIC(14,4) NOT NULL DEFAULT 0,
  weekly_pnl NUMERIC(14,4) NOT NULL DEFAULT 0,
  monthly_pnl NUMERIC(14,4) NOT NULL DEFAULT 0,
  open_risk NUMERIC(14,4) NOT NULL DEFAULT 0,
  win_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  expectancy_r NUMERIC(12,4) NOT NULL DEFAULT 0,
  max_drawdown NUMERIC(14,4) NOT NULL DEFAULT 0,
  trade_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
