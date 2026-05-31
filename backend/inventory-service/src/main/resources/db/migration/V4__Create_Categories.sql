CREATE TABLE categories (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_category UNIQUE (user_id, name)
);

CREATE INDEX idx_categories_user_id ON categories(user_id);
