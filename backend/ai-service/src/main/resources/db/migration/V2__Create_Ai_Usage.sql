CREATE TABLE ai_usage_monthly (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    period_start DATE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_usage_user_period UNIQUE (user_id, period_start)
);
