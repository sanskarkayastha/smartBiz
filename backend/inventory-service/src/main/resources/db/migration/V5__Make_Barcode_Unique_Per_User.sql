ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;
DROP INDEX IF EXISTS idx_products_barcode;

CREATE UNIQUE INDEX IF NOT EXISTS ux_products_user_barcode
    ON products(user_id, barcode)
    WHERE barcode IS NOT NULL;
