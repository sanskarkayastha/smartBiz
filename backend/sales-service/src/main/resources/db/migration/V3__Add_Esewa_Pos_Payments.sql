ALTER TABLE sales
    ADD COLUMN payment_expires_at TIMESTAMP,
    ADD COLUMN payment_reference VARCHAR(255),
    ADD COLUMN stock_reservation_id UUID,
    ADD COLUMN finalized_at TIMESTAMP;

CREATE TABLE merchant_esewa_profiles (
    user_id BIGINT PRIMARY KEY,
    product_code VARCHAR(120) NOT NULL,
    encrypted_access_key TEXT NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'UAT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pos_payment_attempts (
    id UUID PRIMARY KEY,
    sale_id BIGINT NOT NULL UNIQUE REFERENCES sales(id),
    user_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    transaction_uuid VARCHAR(120) NOT NULL UNIQUE,
    booking_id VARCHAR(255),
    correlation_id VARCHAR(255),
    reference_code VARCHAR(255),
    deeplink TEXT,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_payment_user_status ON pos_payment_attempts(user_id, status);
CREATE INDEX idx_pos_payment_expires ON pos_payment_attempts(status, expires_at);
