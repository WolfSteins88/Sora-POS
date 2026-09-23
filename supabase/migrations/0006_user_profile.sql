ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS image varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;
