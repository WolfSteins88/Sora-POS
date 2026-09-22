-- Catalog pack for F&B vs retail filtering
DO $$ BEGIN
  CREATE TYPE catalog_pack AS ENUM ('fnb', 'retail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS catalog_pack catalog_pack NOT NULL DEFAULT 'fnb';
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_pack catalog_pack NOT NULL DEFAULT 'fnb';

CREATE INDEX IF NOT EXISTS idx_products_catalog_pack ON products(catalog_pack);
CREATE INDEX IF NOT EXISTS idx_categories_catalog_pack ON categories(catalog_pack);
