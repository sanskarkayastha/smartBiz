ALTER TABLE users
    ADD COLUMN paid_plan VARCHAR(20) NOT NULL DEFAULT 'FREE',
    ADD COLUMN paid_until TIMESTAMP,
    ADD COLUMN trial_ends_at TIMESTAMP;

UPDATE users
SET trial_ends_at = CURRENT_TIMESTAMP + INTERVAL '14 days'
WHERE trial_ends_at IS NULL;

CREATE TABLE billing_payments (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    billing_term VARCHAR(20) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NPR',
    status VARCHAR(30) NOT NULL,
    transaction_uuid VARCHAR(120) NOT NULL UNIQUE,
    provider_reference VARCHAR(255),
    checkout_url TEXT,
    start_token VARCHAR(255) UNIQUE,
    return_url TEXT NOT NULL,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_payments_user_id ON billing_payments(user_id);
CREATE INDEX idx_billing_payments_status ON billing_payments(status);

CREATE TABLE processed_payment_events (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_processed_payment_event UNIQUE (provider, event_id)
);
