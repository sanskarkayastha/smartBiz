CREATE TABLE stock_reservations (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_reservation_items (
    id BIGSERIAL PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES stock_reservations(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    CONSTRAINT uq_stock_reservation_product UNIQUE (reservation_id, product_id)
);

CREATE INDEX idx_stock_reservations_user_status ON stock_reservations(user_id, status);
