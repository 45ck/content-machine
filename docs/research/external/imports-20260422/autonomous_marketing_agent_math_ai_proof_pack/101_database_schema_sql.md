# Database Schema

Converted from `101_database_schema.sql` so the pack remains Markdown-only.

```sql
-- Autonomous Ad Factory database schema
-- Designed as a starting point for PostgreSQL.

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  icp TEXT,
  primary_job TEXT,
  pricing_model TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  raw_claim TEXT NOT NULL,
  approved_wording TEXT NOT NULL,
  prohibited_wording TEXT,
  risk_level TEXT CHECK (risk_level IN ('low','medium','high','blocked')),
  proof_type TEXT,
  proof_url TEXT,
  required_disclaimer TEXT,
  jurisdiction TEXT,
  expires_at DATE,
  status TEXT CHECK (status IN ('draft','evidence_pending','approved','approved_with_disclaimer','expired','blocked')),
  owner TEXT,
  approver TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buyer_insights (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  quote TEXT,
  source_type TEXT,
  buyer_state TEXT,
  persona TEXT,
  theme TEXT,
  objection TEXT,
  desired_proof TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hypotheses (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  buyer_state TEXT,
  persona TEXT,
  angle TEXT,
  offer TEXT,
  channel TEXT,
  primary_metric TEXT,
  guardrail_metrics TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  hypothesis_id TEXT REFERENCES hypotheses(id),
  asset_type TEXT,
  channel TEXT,
  copy_json JSONB,
  creative_brief JSONB,
  claim_ids TEXT,
  policy_status TEXT,
  risk_score INTEGER,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE experiments (
  id TEXT PRIMARY KEY,
  hypothesis_id TEXT REFERENCES hypotheses(id),
  platform TEXT,
  campaign_name TEXT,
  budget_cap NUMERIC,
  start_date DATE,
  end_date DATE,
  primary_metric TEXT,
  decision_rule TEXT,
  kill_rule TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE platform_objects (
  id TEXT PRIMARY KEY,
  experiment_id TEXT REFERENCES experiments(id),
  platform TEXT,
  platform_campaign_id TEXT,
  platform_adset_adgroup_id TEXT,
  platform_ad_id TEXT,
  payload JSONB,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metrics_daily (
  id TEXT PRIMARY KEY,
  experiment_id TEXT REFERENCES experiments(id),
  platform TEXT,
  date DATE,
  impressions INTEGER,
  clicks INTEGER,
  spend NUMERIC,
  conversions INTEGER,
  activated_trials INTEGER,
  pipeline_value NUMERIC,
  revenue NUMERIC,
  raw_metrics JSONB
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  object_type TEXT,
  object_id TEXT,
  approver TEXT,
  decision TEXT,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_memos (
  id TEXT PRIMARY KEY,
  experiment_id TEXT REFERENCES experiments(id),
  result TEXT,
  what_worked TEXT,
  what_failed TEXT,
  what_not_to_conclude TEXT,
  next_test TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
