-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

ALTER TABLE public.sales_deals
  ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, SELECT ON public.sales_deals FROM anon;

CREATE POLICY authenticated_insert_sales_deals ON public.sales_deals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY authenticated_select_sales_deals ON public.sales_deals
  FOR SELECT
  TO authenticated
  USING (true);

ALTER VIEW public.sales_by_name SET (security_invoker=true);

REVOKE SELECT ON public.sales_by_name FROM anon;
