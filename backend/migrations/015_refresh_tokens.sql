-- ─── Refresh Tokens ───────────────────────────────────────────────────────────
-- یک رکورد per user (ON CONFLICT DO UPDATE در SaveRefreshToken)
-- token را هرگز plain نگه نمی‌داریم — فقط SHA-256 hash آن

CREATE TABLE IF NOT EXISTS refresh_tokens (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);
