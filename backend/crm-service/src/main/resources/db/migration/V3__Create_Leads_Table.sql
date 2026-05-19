CREATE TABLE leads (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(255),
    stage           VARCHAR(50)  NOT NULL DEFAULT 'NEW',
    source          VARCHAR(50),
    estimated_value DECIMAL(12, 2),
    notes           TEXT,
    follow_up_date  DATE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_user_id    ON leads(user_id);
CREATE INDEX idx_leads_user_stage ON leads(user_id, stage);
