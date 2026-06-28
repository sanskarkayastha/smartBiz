CREATE TABLE supplier_ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    product_id BIGINT,
    quantity INTEGER,
    unit_cost DECIMAL(10, 2),
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_ledger_supplier_created_at
    ON supplier_ledger_entries(supplier_id, created_at DESC);

CREATE INDEX idx_supplier_ledger_user_id
    ON supplier_ledger_entries(user_id);

INSERT INTO supplier_ledger_entries (supplier_id, user_id, type, amount, note)
SELECT id, user_id, 'OPENING_BALANCE', balance_owed, 'Migrated opening balance'
FROM suppliers
WHERE balance_owed > 0;
