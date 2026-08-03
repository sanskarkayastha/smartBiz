ALTER TABLE products ADD COLUMN image_public_id TEXT;

CREATE INDEX idx_products_image_public_id ON products(image_public_id);
