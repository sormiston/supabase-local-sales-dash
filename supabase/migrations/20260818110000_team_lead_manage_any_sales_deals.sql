-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

-- Additive alongside authenticated_insert_own_sales_deals -- Postgres ORs
-- multiple PERMISSIVE policies for the same command, so a rep keeps inserting
-- only under their own rep_id while a team lead can insert under anyone's.
CREATE POLICY team_lead_insert_any_sales_deals ON public.sales_deals
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_team_lead()));

-- sales_deals never had UPDATE/DELETE granted to authenticated at all (only
-- SELECT/INSERT). Granting broadly here and restricting via RLS below mirrors
-- user_profiles' self_update_user_profiles pattern: a rep holds the grant but
-- has no matching policy, so their UPDATE/DELETE attempts affect 0 rows.
GRANT UPDATE, DELETE ON public.sales_deals TO authenticated;

CREATE POLICY team_lead_update_any_sales_deals ON public.sales_deals
  FOR UPDATE
  TO authenticated
  USING ((select public.is_team_lead()))
  WITH CHECK ((select public.is_team_lead()));

CREATE POLICY team_lead_delete_any_sales_deals ON public.sales_deals
  FOR DELETE
  TO authenticated
  USING ((select public.is_team_lead()));
