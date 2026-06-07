-- This runs automatically on first container start (mounted to /docker-entrypoint-initdb.d/)
-- It enables the TimescaleDB extension on the keyspot database

-- Enable TimescaleDB (idempotent)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- The UsageEvent table must be created FIRST by Prisma migration,
-- then this script converts it to a hypertable.
-- We use a DO block to handle timing gracefully.
DO $$
BEGIN
  -- Only convert if the table exists and isn't already a hypertable
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'UsageEvent') THEN
    -- Check if already a hypertable
    IF NOT EXISTS (
      SELECT FROM _timescaledb_catalog.hypertable WHERE table_name = 'UsageEvent'
    ) THEN
      PERFORM create_hypertable('"UsageEvent"', 'timestamp',
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      );
      RAISE NOTICE 'UsageEvent converted to hypertable';
    END IF;
  ELSE
    RAISE NOTICE 'UsageEvent table does not exist yet — run Prisma migration first';
  END IF;
END $$;

-- Indexes (idempotent via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_usage_user_time
  ON "UsageEvent" (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_usage_apikey_time
  ON "UsageEvent" (api_key_id, timestamp DESC);

-- Continuous aggregate for hourly usage (doesn't block, runs in background)
-- Uncomment if you want pre-aggregated metrics
-- CREATE MATERIALIZED VIEW IF NOT EXISTS usage_hourly
--   WITH (timescaledb.continuous) AS
--   SELECT user_id,
--          time_bucket('1 hour', timestamp) AS bucket,
--          count(*) as requests,
--          avg(latency_ms) as avg_latency,
--          count(*) FILTER (WHERE status_code >= 400) as errors
--   FROM "UsageEvent"
--   GROUP BY user_id, bucket;
--
-- SELECT add_continuous_aggregate_policy('usage_hourly',
--   start_offset => INTERVAL '3 days',
--   end_offset => INTERVAL '1 hour',
--   schedule_interval => INTERVAL '1 hour',
--   if_not_exists => TRUE
-- );
