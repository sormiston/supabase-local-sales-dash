-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

ALTER TABLE public.sales_deals
  ADD COLUMN rep_id uuid REFERENCES public.user_profiles (id);

-- No-op on a fresh `supabase db reset` (sales_deals is empty at migration
-- time -- seed.sql loads after migrations run). Protects any environment
-- where this runs against a table that already has populated `name` rows.
UPDATE public.sales_deals sd
SET rep_id = up.id
FROM public.user_profiles up
WHERE up.full_name = sd.name
  AND sd.rep_id IS NULL;

ALTER TABLE public.sales_deals
  ALTER COLUMN rep_id SET NOT NULL;

CREATE INDEX sales_deals_rep_id_idx ON public.sales_deals (rep_id);

-- sales_by_name selects `name` directly, so it must be dropped before that
-- column can be (Postgres refuses otherwise: "other objects depend on it").
DROP VIEW public.sales_by_name;

ALTER TABLE public.sales_deals
  DROP COLUMN name;

DROP POLICY authenticated_insert_sales_deals ON public.sales_deals;

CREATE POLICY authenticated_insert_own_sales_deals ON public.sales_deals
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = rep_id);

-- Same output shape (name, total_value, deal_count) plus rep_id, so the
-- frontend's current consumers of this view keep working unmodified for the
-- columns they already use.
CREATE VIEW public.sales_by_name AS
SELECT
  up.id AS rep_id,
  up.full_name AS name,
  sum(sd.value) AS total_value,
  count(*) AS deal_count
FROM public.sales_deals sd
JOIN public.user_profiles up ON up.id = sd.rep_id
GROUP BY up.id, up.full_name;

-- View settings/grants don't survive drop/create -- reapply both.
ALTER VIEW public.sales_by_name SET (security_invoker = true);
GRANT SELECT ON public.sales_by_name TO authenticated;
