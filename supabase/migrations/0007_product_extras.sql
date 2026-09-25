ALTER TABLE products ADD COLUMN IF NOT EXISTS use_variants boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS use_addons boolean NOT NULL DEFAULT false;

UPDATE products SET use_variants = true
WHERE id IN (SELECT DISTINCT product_id FROM product_variants);

UPDATE products SET use_addons = true
WHERE id IN (SELECT DISTINCT product_id FROM product_addons);
