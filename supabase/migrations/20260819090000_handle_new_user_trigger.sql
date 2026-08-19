-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

-- Single source of truth for user_profiles creation: previously only
-- invite-user's service-role insert created these rows, making it the only
-- valid path for account creation. A trigger means any path that inserts
-- into auth.users (the invite flow today, and any future server-side path)
-- automatically gets a matching profile row.
--
-- SECURITY DEFINER is required, not just convention: the auth.users insert
-- runs as GoTrue's own Postgres role, which holds no grants on
-- public.user_profiles. Running as the function owner reuses the
-- service_role/postgres grants already set up in
-- 20260817130000_create_user_profiles.sql, so nothing new needs granting.
--
-- role is read out of raw_user_meta_data and defaults to 'rep' if absent.
-- This is deliberately safe despite user_metadata being user-editable later
-- (via auth.updateUser): this trigger is AFTER INSERT only, so it fires
-- exactly once at account-creation time. From then on user_profiles.role is
-- the sole source of truth, protected from self-update by the existing
-- self_update_user_profiles policy and column-level grant (authenticated can
-- only touch full_name, never role) -- later edits to user_metadata.role
-- have no effect on it.
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'rep')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
