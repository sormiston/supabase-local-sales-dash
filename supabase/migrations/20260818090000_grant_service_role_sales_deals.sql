-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

-- sales_deals never got the service_role CRUD grants that user_profiles
-- explicitly has (see 20260817130000_create_user_profiles.sql): the original
-- first.sql migration only granted references/trigger/truncate to
-- service_role, not select/insert/update/delete. service_role's BYPASSRLS
-- attribute skips policy checks but not the base SQL privilege system, so
-- without this grant service_role gets 42501 on sales_deals same as any other
-- role -- e.g. it can't clean up rows on behalf of admin/backend tooling.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_deals TO service_role;
