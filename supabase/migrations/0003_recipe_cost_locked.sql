ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cost_locked boolean NOT NULL DEFAULT false;
