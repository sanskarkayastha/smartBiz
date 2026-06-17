CREATE TABLE import_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    mode VARCHAR(32) NOT NULL,
    title VARCHAR(255),
    summary TEXT,
    analysis_json TEXT,
    review_json TEXT,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_import_sessions_user_status ON import_sessions (user_id, status);
CREATE INDEX idx_import_sessions_user_updated ON import_sessions (user_id, updated_at DESC);

CREATE TABLE import_artifacts (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
    kind VARCHAR(32) NOT NULL,
    label VARCHAR(255),
    normalized_text TEXT,
    extracted_json TEXT,
    source_intent VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_import_artifacts_session_created ON import_artifacts (session_id, created_at DESC);

CREATE TABLE product_aliases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    alias_name VARCHAR(255) NOT NULL,
    normalized_alias VARCHAR(255) NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    supplier VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_product_aliases_user_normalized_alias
    ON product_aliases (user_id, normalized_alias);
