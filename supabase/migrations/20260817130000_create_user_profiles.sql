-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

CREATE TABLE public.user_profiles (
  id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'rep' CHECK (role IN ('rep', 'team_lead')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER is intentional: lets a policy check the caller's own role
-- without recursively re-triggering RLS on user_profiles. Takes no input,
-- returns only a bool.
CREATE FUNCTION public.is_team_lead()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'team_lead'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_team_lead() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_lead() TO authenticated;

-- SELECT is open to all authenticated users (not "own row or team lead"):
-- this is a shared dashboard where every rep's name is already visible to
-- everyone via sales_by_name (security_invoker view joined to this table),
-- so restricting profile visibility here would only break that view for
-- non-team-leads without adding real protection.
CREATE POLICY authenticated_select_user_profiles ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY self_update_user_profiles ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

GRANT SELECT ON public.user_profiles TO authenticated;

-- Column-level grant is what actually blocks self role-escalation: RLS above
-- only decides which ROW is writable, not which COLUMN. An UPDATE touching
-- `role` (not granted) fails the whole statement with 42501, regardless of
-- the USING/CHECK clauses. No insert/delete grants to authenticated at all --
-- rows are only created by the invite Edge Function (service_role) and
-- removed via the FK's on delete cascade.
GRANT UPDATE (full_name) ON public.user_profiles TO authenticated;

-- service_role's BYPASSRLS attribute skips policy checks but not the base
-- SQL privilege system -- it still needs explicit table grants like any
-- other role. This project's tables don't get CRUD grants by default (see
-- sales_deals' history of separately-granted select/insert migrations), so
-- service_role needs them spelled out here for the invite Edge Function to
-- be able to insert profile rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;

-- Only path to change a role: a team-lead-gated RPC, not a raw UPDATE.
CREATE FUNCTION public.set_user_role(target_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_team_lead() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF new_role NOT IN ('rep', 'team_lead') THEN
    RAISE EXCEPTION 'invalid role: %', new_role;
  END IF;
  UPDATE public.user_profiles SET role = new_role WHERE id = target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
