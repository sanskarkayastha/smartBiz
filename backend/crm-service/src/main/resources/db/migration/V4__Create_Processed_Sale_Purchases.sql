CREATE TABLE processed_sale_purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    sale_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_processed_sale_purchase UNIQUE (user_id, sale_id)
);

CREATE INDEX idx_processed_sale_purchases_customer ON processed_sale_purchases(user_id, customer_id);
