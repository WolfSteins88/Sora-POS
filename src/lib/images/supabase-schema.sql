-- Prepare-only. Do NOT apply to the live cashier PostgreSQL.
-- Supabase Storage bucket for product/category/logo images.
-- Keep umkm-pos checkout on local Postgres.

-- In Supabase dashboard: create public bucket `pos-images`.
-- Suggested policies (Storage):
--   INSERT/UPDATE/DELETE: authenticated roles that manage catalog
--   SELECT: authenticated (kasir needs thumbs)

-- Example SQL (run in Supabase SQL editor, not npm run db:setup):
-- insert into storage.buckets (id, name, public) values ('pos-images', 'pos-images', true)
-- on conflict (id) do nothing;
