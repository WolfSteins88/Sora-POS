ALTER TABLE recipes ADD COLUMN IF NOT EXISTS portion varchar(100);
ALTER TABLE recipes ALTER COLUMN note TYPE varchar(500);
