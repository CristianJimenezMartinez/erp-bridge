-- Migration 003: Auto-Update Tables

CREATE TABLE IF NOT EXISTS update_manifests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version       VARCHAR(20) NOT NULL UNIQUE,
  channel       VARCHAR(20) NOT NULL DEFAULT 'stable',
  platform      VARCHAR(20) NOT NULL DEFAULT 'win32_x64',
  download_url  TEXT NOT NULL,
  sha256        VARCHAR(64) NOT NULL,
  signature     TEXT NOT NULL,
  file_size     BIGINT,
  release_notes TEXT,
  mandatory     BOOLEAN NOT NULL DEFAULT FALSE,
  min_version   VARCHAR(20),
  published_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS update_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      VARCHAR(64) NOT NULL,
  from_version  VARCHAR(20),
  to_version    VARCHAR(20),
  status        VARCHAR(20) NOT NULL,
  error_message TEXT,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_update_manifests_version ON update_manifests(version);
CREATE INDEX IF NOT EXISTS idx_update_manifests_channel ON update_manifests(channel);
CREATE INDEX IF NOT EXISTS idx_update_history_agent ON update_history(agent_id);
