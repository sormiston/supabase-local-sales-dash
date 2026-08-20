# Changelog

## 2026-08-11 — Unit testing for the supabase-js client (`7ca5a39`)

**Objective:** Establish the project's first test infrastructure, exercising the Supabase-generated REST API (PostgREST) through the `supabase-js` client against real data rather than mocks.

**Implementation:**
- Fixed a real gap found while testing: `anon`/`authenticated` had no `SELECT` grant on `sales_deals` or `sales_by_name` (`supabase/migrations/20260811010000_grant_select_sales.sql`).
- Added `@supabase/supabase-js` and `vitest`; introduced `src/lib/supabaseClient.ts` as the shared client.
- Tests live in a top-level `tests/` directory (not under `src/`), with `@` → `src` and `@tests` → `tests` path aliases and a dedicated `tsconfig.test.json`.
- `tests/salesDeals.test.ts` and `tests/salesByName.test.ts` assert against known seed data in `supabase/seed.sql`.

## 2026-08-11 — Homepage: header + sales-by-name bar chart (`ff99ca0`)

**Objective:** Build the app's first real screen — replacing the unmodified Vite/React starter with a header and a chart of `sales_by_name`.

**Implementation:**
- Added TailwindCSS v4 (`@tailwindcss/vite`, CSS-first config) and Recharts for the bar chart.
- `src/hooks/useSalesByName.ts`: fetches `sales_by_name` with abort-on-unmount/re-fetch race protection.
- `src/components/AppHeader.tsx` and `src/components/SalesByNameChart.tsx`: bar per rep name (`total_value`), with `deal_count` shown in a hover tooltip, comma-formatted value labels, and loading/error/empty states.
- `src/App.tsx` rewritten to compose the header and chart.

## 2026-08-13 — Adopt oxfmt as formatter (`aa3262f`)

**Objective:** Standardize code formatting across the repo.

**Implementation:** Added `oxfmt` as a dev dependency with `.oxfmtrc.json` (no semicolons, single quotes, Tailwind class sorting), recommended the corresponding VS Code extension, and reformatted all existing source files to match.

## 2026-08-15 — Make sales-by-name data update live via Supabase Realtime (`f568f91`)

**Objective:** Update the sales-by-name chart in real time as `sales_deals` rows change, without requiring a page refresh.

**Implementation:**
- `supabase/migrations/20260811020000_add_sales_deals_to_realtime.sql`: adds `sales_deals` to the `supabase_realtime` publication (views can't be subscribed to directly — only tables are replicated).
- `useSalesByName` now subscribes to `postgres_changes` on `sales_deals` and refetches the view on any insert/update/delete, aborting in-flight requests and surfacing `CHANNEL_ERROR`/`TIMED_OUT` as an error.
- `SalesByNameChart` shows the loading state only on initial load, not on every realtime-triggered refetch.

## 2026-08-15 — Add a form to record new sales deals, with realtime state lifted to App (`0f6e535`)

**Objective:** Let users add a deal from the UI (rep dropdown, deal value, submit), sharing the existing live `sales_by_name` data rather than issuing a second fetch/subscription.

**Implementation:**
- `src/components/AddSalesDealForm.tsx`: an uncontrolled form built on React 19's `useActionState` — no field-level `useState`. The rep dropdown is derived from the same `sales_by_name` rows already fetched (no separate query). The action validates rep selection and a positive integer value before inserting into `sales_deals`.
- `useSalesByName()` is now called once in `App`, which passes `data`/`loading`/`error` down as props to both `SalesByNameChart` (now presentational) and `AddSalesDealForm`, avoiding duplicate fetches and duplicate realtime channels.
- `supabase/migrations/20260815191143_grant_insert_sales_deals.sql`: grants `INSERT` on `sales_deals` to `anon`/`authenticated`, which was missing and blocked every submission.

## 2026-08-16 — Supabase email/password login, route guards, and demo auth seed (`1f6e667`)

**Objective:** Gate the dashboard behind Supabase Auth email/password sign-in, and make the local seed reproduce working demo accounts alongside the existing sales data.

**Implementation:**
- `react-router-dom` introduced in `src/main.tsx`/`src/App.tsx` (`BrowserRouter`, nested `Route`s); the dashboard content moves out of `App.tsx` into `src/pages/Dashboard.tsx`, with `src/pages/Login.tsx` as the new `/` route.
- `src/context/AuthContext.tsx`: a single `AuthProvider`/`useAuth()` context wrapping `supabase.auth.getSession()` + `onAuthStateChange`, shared by every consumer instead of each subscribing independently.
- `src/components/RequireAuth.tsx` / `RequireGuest.tsx`: layout-route guards (`<Outlet/>` vs `<Navigate/>`) so `/dashboard` and `/` never mount the wrong page before redirecting — avoids a login-screen flash for users who are already authenticated.
- `src/pages/Login.tsx`: a `useActionState` form (mirroring `AddSalesDealForm`'s pattern) calling `supabase.auth.signInWithPassword`. `src/components/AppHeader.tsx` now shows the signed-in user's email and a sign-out control.
- `AddSalesDealForm`/`SalesByNameChart`/`useSalesByName` take a `loading` flag so the "no reps yet" / "no sales data yet" empty states don't flash before the initial fetch resolves.
- `supabase/seed.sql` and `package.json`'s `db:generate-seed`: the dump now includes `-s public,auth` with every ephemeral/session `auth.*` table (tokens, MFA, SSO, audit log, etc.) excluded, so `supabase db reset` reseeds two demo accounts (`alice@salesdash.com`, `john@salesdash.com`) alongside the sales data.

## 2026-08-16 — Sign-up page at /register (`6baae75`)

**Objective:** Let new users create an account from the UI instead of only signing in with pre-seeded demo accounts.

**Implementation:**
- `src/pages/SignUp.tsx`: mirrors `Login.tsx`'s `useActionState` form pattern — email, password, and confirm-password fields, validated client-side (required fields, password match) before calling `supabase.auth.signUp`. Local auth has `enable_confirmations = false`, so signup returns an active session immediately and the form redirects straight to `/dashboard`, same as sign-in.
- `src/App.tsx`: `/register` is nested inside the existing `RequireGuest` layout route alongside `/`, so an already-authenticated user hitting `/register` is redirected to `/dashboard`.
- `src/pages/Login.tsx`: adds a "Sign up" link to `/register`; `SignUp.tsx` links back to `/` ("Sign in"), so neither auth page is a dead end.

## 2026-08-16 — Enable RLS on public schema, scoped to authenticated only (`c54f8b4`)

**Objective:** Close the Data API — which had been open to unauthenticated (`anon`) callers since the tables were first exposed — down to `authenticated`-only, per the security advisor's `rls_disabled_in_public` and `security_definer_view` findings.

**Implementation:**
- `supabase/migrations/20260816125023_rls_authenticated_only.sql`: enables RLS on `sales_deals` with blanket `authenticated`-only `SELECT`/`INSERT` policies (no per-owner filtering — the table has no ownership column, it's a shared dataset), fixes `sales_by_name` to run with `security_invoker` so it respects that RLS instead of bypassing it as the view owner, and revokes `anon`'s grants on both entirely rather than relying on RLS alone to filter it out.
- `tests/testAuth.ts` (new) and the restructured `tests/salesDeals.test.ts`/`tests/salesByName.test.ts`: each file now has an "as anon" suite asserting the query is denied with Postgres error `42501`, followed by an "as authenticated" suite running the original assertions against a dedicated test-only account created via `supabase.auth.signUp` (falling back from `signInWithPassword` on first run, since there's no known password for the seeded demo users).
- `vitest.config.ts`: sets `fileParallelism: false` — both files' authenticated suites sign in as the same test account, which raced under the default parallel-file execution.

## 2026-08-16 — Production deployment: Supabase project + Vercel, auto-deploy on push to `main` (`6b3fb5b`)

**Objective:** Move off local-only development — provision a real production Supabase project and a Vercel frontend deployment, with pushes to `main` auto-deploying both.

**Implementation:**
- Provisioned a new Supabase project, `supabase-local-sales-dash-prod` (`kzpwproskteovgmbyrnf`, `eu-west-1`, free tier) — a fresh project rather than reusing an existing unrelated one in the org, so production starts exactly at this repo's migration history with no schema drift. All 6 local migrations were applied via the Supabase MCP `apply_migration` in order; `supabase/seed.sql` was intentionally **not** run, so production starts with real, empty tables instead of local demo data.
- `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml`: `vercel` added as a devDependency (see previous entry) so the Vercel side could be driven entirely from the CLI: `vercel link` created and linked a new Vercel project (`sormistons-projects/supabase-local-sales-dash`), auto-detecting Vite and auto-connecting the GitHub repo in the same step; `vercel env add` set `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` (Production and Preview) to the new project's values — as **non-sensitive**, since `vercel env add`'s default "Sensitive" type can't be read back by `vercel pull` for local prebuilt deploys, which silently baked the literal string `"[SENSITIVE]"` in as the Supabase URL on the first attempt; `vercel build --prod` + `vercel deploy --prebuilt --prod` shipped the first production deployment, now live at `https://supabase-local-sales-dash.vercel.app`.
- Manual one-time dashboard setup (no CLI/MCP equivalent exists for either): Supabase's GitHub Integration was connected and "Deploy to production" enabled for `main`, so future migration files auto-deploy; Supabase Auth's Site URL/Redirect URLs were pointed at the new Vercel production domain.

## 2026-08-16 — Add SPA rewrite so client-side routes work on Vercel (`e3ee0f6`)

**Objective:** Fix `/dashboard` (and any other client-side route) 404ing on Vercel when hit via direct navigation or a page refresh, rather than only through in-app client-side navigation.

**Implementation:**
- `vercel.json`: a catch-all rewrite (`/(.*)` → `/index.html`). Vercel's static file server only knows about actual files on disk (just `index.html` for a Vite SPA build) — without the rewrite, any path other than `/` 404s before `react-router-dom` (`BrowserRouter`) ever gets a chance to render the matching route client-side. Verified the rewrite doesn't shadow real static assets (JS/CSS under `/assets/`), which Vercel's build output still serves via filesystem lookup ahead of the rewrite.

## 2026-08-16 — Add catch-all route redirecting unrecognized paths to / (`3c2a1a6`)

**Objective:** Once the Vercel rewrite (previous entry) started routing every unmatched path to the SPA shell instead of a server 404, a genuinely nonexistent path (e.g. a typo) had nowhere left to land: `react-router-dom` had no matching `<Route>` and silently rendered nothing, logging "No routes matched location" with a blank body.

**Implementation:**
- `src/App.tsx`: adds a wildcard `<Route path="*" element={<Navigate to="/" replace />} />` as the last route, outside the `RequireGuest`/`RequireAuth` layout routes. An unmatched path now resolves to `/` — Login if signed out, or straight on to `/dashboard` via `RequireGuest`'s existing redirect if already authenticated.

## 2026-08-17 — Real user identity for sales deals via `user_profiles` and roles (`TBD`)

**Objective:** Replace `sales_deals`' free-text `name` column with a real user reference, backed by a new `user_profiles` table that also carries a `rep`/`team_lead` role for future role-based access.

**Implementation:**
- `supabase/migrations/20260817130000_create_user_profiles.sql`: new `public.user_profiles` table (`id` FK to `auth.users`, `full_name`, `role` constrained to `rep`/`team_lead`). RLS is open for `SELECT` (this is a shared dashboard — every rep's name is already visible to everyone via `sales_by_name`) but write access is deliberately layered: a `self_update_user_profiles` policy lets a user touch only their own row, and a column-scoped `GRANT UPDATE (full_name)` (no grant on `role`) means even a misconfigured policy couldn't let someone self-promote — Postgres rejects the whole statement at the privilege layer before RLS is even consulted. The only way to change a role is the team-lead-gated `set_user_role()` RPC, which checks a `SECURITY DEFINER` `is_team_lead()` helper. No `auth.users` trigger auto-creates profiles — that's deliberate groundwork for a future server-side account-creation path that can create the matching profile row itself in the same request.
- `supabase/migrations/20260817130100_sales_deals_rep_id.sql`: adds `sales_deals.rep_id` (FK to `user_profiles`), backfills it by matching the outgoing `name` column against seeded `full_name` values, then drops `name` once the column is `NOT NULL`. The `INSERT` policy is tightened from blanket `WITH CHECK (true)` to `WITH CHECK (auth.uid() = rep_id)` — a user can only log deals under their own identity now that a real identity exists to check. `sales_by_name` is rebuilt to join `user_profiles`, keeping its output shape (`name`, `total_value`, `deal_count`) so existing consumers of those columns are unaffected.
- `supabase/seed.sql`: adds `marcus@salesdash.com`/`priya@salesdash.com` (previously deal-only names with no real account) alongside explicit `user_profiles` rows for all four seed users, since nothing auto-creates them during a seed load. Alice is seeded as the sole `team_lead` so local dev already has one bootstrapped. Also backfills `full_name` into the existing alice/john `auth.users` rows' `raw_user_meta_data`, matching the shape a future account-creation path would write for new users.
- `src/lib/database.types.ts`: regenerated (`pnpm db:generate-types`) to add `user_profiles`, `sales_deals.rep_id`, the `sales_by_name` view's new `rep_id` column, and the `is_team_lead`/`set_user_role` RPC signatures.
- `tests/salesDeals.test.ts` / `tests/salesByName.test.ts`: updated to assert against `rep_id` instead of the dropped `name` column.

**Verification:** `supabase db reset` applied cleanly end-to-end. Confirmed via direct SQL (impersonating seed users through `request.jwt.claims`/`set local role authenticated`) that: a non-team-lead's attempt to `UPDATE ... SET role = 'team_lead'` on their own row fails with `42501` while updating their own `full_name` succeeds; inserting a `sales_deals` row with another rep's `rep_id` fails with `42501` while inserting with your own succeeds; `set_user_role()` succeeds for the team lead seed user and raises `not authorized` for a non-team-lead. `get_advisors` (security) shows only the two expected `SECURITY DEFINER`-callable-by-`authenticated` warnings for `is_team_lead()`/`set_user_role()`, both of which self-guard internally by design.

**Remaining work (deliberately out of scope for this change):**
- `src/components/AddSalesDealForm.tsx` still references the dropped `name` column/shape — needs its rep-selection UI rebuilt against `rep_id` (per the tightened insert policy, a user can only log deals for themselves, so the plan is to drop the rep dropdown and submit the signed-in user's own `rep_id` automatically) and `src/pages/Dashboard.tsx`'s prop wiring updated to match.

## 2026-08-17 — Team-lead-gated invite flow replaces self-service sign-up (`TBD`)

**Objective:** Move account creation off self-service sign-up onto a server-side, team-lead-only invite flow that pre-assigns the role rather than trusting the client, using the `user_profiles`/role groundwork from the previous entry.

**Implementation:**
- `supabase/functions/invite-user/index.ts` (new Edge Function): the only place `role` is ever set. Verifies the caller's JWT and calls `is_team_lead()` via RPC before doing anything (403 otherwise), then uses the service_role key to call `auth.admin.inviteUserByEmail()` (only `full_name` goes into user metadata — never `role`, since metadata is user-editable later) and writes the `user_profiles` row directly, bypassing RLS. Required an explicit `GRANT ... TO service_role` on `user_profiles` (added in the previous entry's migration) — `service_role`'s `BYPASSRLS` attribute skips policy checks but not the base SQL privilege system, which this project's tables don't get by default (same pattern already seen with `sales_deals`' separately-granted `SELECT`/`INSERT`).
- `src/App.tsx`: removes the `/register` route entirely; adds `/team-lead/invite` nested inside a new `RequireTeamLead` layout guard (`src/components/RequireTeamLead.tsx`, mirroring the existing `RequireAuth`/`RequireGuest` pattern) rendering the new `src/pages/InviteTeamMembers.tsx` form, which calls the Edge Function via `supabase.functions.invoke('invite-user', ...)`.
- `src/pages/Login.tsx`: removes the now-dead "Sign up" link to `/register`.
- `.vscode/extensions.json`: adds the `denoland.vscode-deno` recommendation, needed for editing the new Deno-based Edge Function.

**Verification:** Confirmed via HTTP against the locally-served Edge Function that a non-team-lead's invite request returns `403` and a team lead's returns `200` with a real `user_profiles` row created at the correct role. `tsc -b` confirms `App.tsx`/`Login.tsx`/`InviteTeamMembers.tsx`/`RequireTeamLead.tsx` compile cleanly against the regenerated types.

**Remaining work (deliberately out of scope for this change):**
- `src/pages/SignUp.tsx` is now dead code (unrouted but not deleted); no UI yet exists for listing or promoting/demoting existing team members beyond the bare invite form.
- strongly consider refactoring the boolean isTeamLead privilege gate to a pattern of [Custom Claims and Role Based Access Control with enumerated role permissions](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac)

## 2026-08-18 — Integration test coverage for `user_profiles`/`rep_id` RLS and RPCs (`TBD`)

**Objective:** Add automated coverage for the RLS policies, column-level grant, and `set_user_role()`/`is_team_lead()` RPCs introduced by the `user_profiles`/`rep_id` migration pair (two entries above), which had previously only been verified by hand via direct SQL.

**Implementation:**
- `tests/testAuth.ts`: replaces the single throwaway `createAuthenticatedClient()` with `createAuthenticatedRepClient()`/`createAuthenticatedTeamLeadClient()`, signing in as the seeded Alice (`team_lead`) and John (`rep`) demo accounts (every seeded demo user's password is `<name>123`). Also adds `createServiceRoleClient()`, used only to tear down rows a test itself created that `authenticated` has no grant to touch, never to assert RLS behavior.
- `supabase/migrations/20260818090000_grant_service_role_sales_deals.sql`: a real gap found while wiring up that cleanup client — `sales_deals` never received the `service_role` CRUD grant that `user_profiles` already has; the original `first.sql` migration only granted `references`/`trigger`/`truncate` to `service_role`, so `service_role` was hitting `42501` too. Grants `SELECT`/`INSERT`/`UPDATE`/`DELETE` to `service_role`, matching the pattern already established for `user_profiles`.
- `tests/userProfiles.test.ts` (new): anon denied by RLS; an authenticated rep can read every profile (open-read policy) but can only update its own `full_name` — not another user's row, and not its own `role`, since the column-level grant blocks that at the privilege layer independent of RLS; `is_team_lead()`/`set_user_role()` exercised from both roles — a rep gets `false`/`not authorized`, a team lead gets `true` and can change another user's role (reverted after each assertion so the suite stays idempotent across repeated local runs), and an invalid role is rejected.
- `tests/salesDeals.test.ts`: adds insert-policy coverage — a rep can insert a deal under their own `rep_id` but not under someone else's (`42501`), confirming the migration's tightened `WITH CHECK (auth.uid() = rep_id)`.
- `vitest.config.ts`: widens `envPrefix` in this vitest-only config (not the app's `vite.config.ts` build) so the new `SUPABASE_SECRET_KEY` is readable via `import.meta.env` in tests without becoming statically replaceable in the shipped app bundle; `.env.example`/`.env.test` document the key, scoped explicitly to test cleanup.

**Verification:** `pnpm test` (17/17 passing), run against both the current local DB and a fresh `supabase db reset`, and repeated back-to-back to confirm no state leaks between runs. `tsc -p tsconfig.test.json` and `oxfmt --check` clean on all touched files.

## 2026-08-18 — Team leads can insert/update/delete any sales_deals row (`TBD`)

**Objective:** Close a gap the tests above surfaced: `sales_deals` `INSERT` was rep-only, and `UPDATE`/`DELETE` had no grant or policy at all, so a team lead had no way to log or correct a deal on someone else's behalf.

**Implementation:**
- `supabase/migrations/20260818110000_team_lead_manage_any_sales_deals.sql`: adds an additive `team_lead_insert_any_sales_deals` policy alongside the existing rep-only one (Postgres ORs permissive policies), and grants `UPDATE`/`DELETE` to `authenticated` for the first time, restricted to team leads via new `team_lead_update_any_sales_deals`/`team_lead_delete_any_sales_deals` policies — reps hold the grant but have no matching policy, so their own `UPDATE`/`DELETE` attempts still affect 0 rows.
- `tests/salesDeals.test.ts`: covers a team lead inserting/updating/deleting a deal on another rep's behalf, plus a negative check that a rep still can't touch their own seeded deal via `UPDATE`/`DELETE`.

**Verification:** `pnpm test` (20/20 passing), against both current state and a fresh `supabase db reset`.

## 2026-08-19 — `user_profiles` rows are created by an `auth.users` trigger, not the invite Edge Function (`TBD`)

**Objective:** `invite-user` was the only valid path for account creation, since it was the only code that inserted `user_profiles` rows. Decouple profile creation from that one Edge Function so any path that creates an `auth.users` row gets a profile automatically.

**Implementation:**
- `supabase/migrations/20260819090000_handle_new_user_trigger.sql`: adds `handle_new_user()` (`SECURITY DEFINER`) and an `AFTER INSERT ON auth.users` trigger that creates the matching `user_profiles` row from `raw_user_meta_data`'s `full_name`/`role` (defaulting `role` to `'rep'`).
- `supabase/functions/invite-user/index.ts`: passes `role` into the invited user's metadata instead of inserting `user_profiles` directly. Safe because the trigger fires once, at creation, and `user_profiles.role` stays unwritable by the user afterward (existing self-update policy/grant), so a later `auth.updateUser()` metadata edit can't change it.
- `tests/userProfiles.test.ts`: adds a regression test proving that guarantee — a rep updating their own metadata `role` does not change `user_profiles.role`.
- `tests/inviteUser.test.ts`: updates the metadata assertion now that `role` is expected there.

**Verification:** Confirmed the trigger fires independent of any application code via a direct `curl` call to GoTrue's admin API (bypassing `invite-user` entirely) and a `user_profiles` select. `pnpm test` (28/28 passing), run twice for idempotency, against both current state and a fresh `supabase db reset`.

## 2026-08-20 — Role-based UI: role badge, and rep/team-lead-aware deal form (`TBD`)

**Objective:** Close the frontend gap left by the `user_profiles`/role groundwork (2026-08-17 entries) — nothing in the UI actually read or displayed a user's role yet. Also closes the "remaining work" note on the same date: `AddSalesDealForm` still assumed the pre-`rep_id` shape.

**Implementation:**
- `src/context/AuthContext.tsx`: fetches the signed-in user's `role`/`full_name` from `user_profiles` (keyed on `session.user.id`, refetched only when the user id changes so token refreshes don't retrigger it) and exposes it as `profile: { role, fullName } | null`, alongside the existing `session`/`loading`. Deliberately kept as a plain client-side fetch rather than moving role into a custom JWT claim (the pattern flagged in the 2026-08-17 invite-flow entry) — `is_team_lead()` is already `SECURITY DEFINER STABLE`, so RLS only pays the `user_profiles` lookup cost once per statement, not once per row, which is most of the performance case the JWT-claims pattern exists to solve. A claims-based role would also go stale for up to `jwt_expiry` (3600s) after `set_user_role()` changes someone's role, and a bug in the token-issuance hook risks breaking login for every user rather than one query for one caller. Still an option worth reconsidering if RLS performance genuinely becomes a bottleneck.
- `src/components/RequireTeamLead.tsx`: refactored to read `profile` from `useAuth()` instead of independently querying `user_profiles` — removes a duplicate fetch that predated `AuthContext` exposing role at all.
- `src/components/AppHeader.tsx`: shows a "Team Lead"/"Rep" badge next to the signed-in user's email once `profile` resolves.
- `src/hooks/useTeamProfiles.ts` (new, replacing an interim `useReps.ts`): one-shot fetch of `id, full_name` from `user_profiles`, un-filtered by role — team leads can log deals under their own name too, so they need to appear in their own picker. Sourcing straight from `user_profiles` (rather than the `sales_by_name` view, which inner-joins `sales_deals`) also fixes a latent lockout: a brand-new rep or team lead with zero deals previously wouldn't appear in `sales_by_name` at all, so they couldn't be selected — including, for a rep, in their own locked selector — until someone already had a deal on record.
- `src/components/AddSalesDealForm.tsx`: branches on `profile.role`. A team lead gets the full picker (via `useTeamProfiles`). A rep gets a disabled `<select>` showing only their own name (`profile.fullName`) plus a sibling `<input type="hidden" name="rep">` carrying their id — disabled form controls are excluded from `FormData`, so the hidden input is what actually submits. Dropped the `data`/`loading` props entirely; the component now sources everything from `useAuth()`/`useTeamProfiles()` directly.
- `src/pages/Dashboard.tsx`: `<AddSalesDealForm />` now takes no props (still wires `useSalesByName()` into `SalesByNameChart` unchanged).

**Verification:** `tsc -b`, `oxlint`, and `oxfmt --check` clean (two pre-existing formatting warnings in untouched files noted and left alone). `pnpm test` 29/29. Manually verified in-browser against the local stack: signed in as John (rep) — badge reads "Rep", selector locked to his own name, submission succeeds, `/team-lead/invite` redirects away; signed in as Alice (team lead) — badge reads "Team Lead", selector lists every profile including herself, submission on another rep's behalf succeeds, `/team-lead/invite` is reachable. Invited a brand-new rep with zero deals and confirmed they immediately appeared in the team lead's picker (the `sales_by_name`-lockout fix), then ran `supabase db reset` to clear that test data and the ad-hoc deals inserted during manual verification before re-running the suite.

## 2026-08-20 — Accept-invite page: invited users can now actually set a password (`bf39ed1`)

**Objective:** Close a gap in the invite flow: clicking an invite email's link established a session (via GoTrue's default confirmation redirect) but the app had no page to receive it, so an invited user landed signed-in with no password ever set and could never sign back in after signing out.

**Implementation:**
- `supabase/templates/invite.html` (new) + `supabase/config.toml`'s now-uncommented `[auth.email.template.invite]`: a custom invite email linking to `/accept-invite?token_hash={{ .TokenHash }}&type=invite` instead of GoTrue's default `{{ .ConfirmationURL }}`. This is deliberate, not cosmetic — the default link uses the implicit flow, where `supabase-js` auto-consumes the session-bearing URL hash before any app code runs, and there's no event distinguishing an invite session from an ordinary sign-in. Sending users straight to our own route with an explicit `token_hash` lets `AcceptInvite` call `supabase.auth.verifyOtp()` itself, on its own schedule.
- `src/pages/AcceptInvite.tsx` (new): verifies the token via `verifyOtp`, guarded by a `useRef` so React's `StrictMode` double-invoking the effect in dev doesn't burn the single-use token on its own first render; then shows a set-password form (`supabase.auth.updateUser`) before redirecting to `/dashboard`.
- `src/App.tsx`: `/accept-invite` is added as a flat top-level route, deliberately **not** nested under `RequireGuest` or `RequireAuth`. `verifyOtp` establishes a real session mid-page; nesting under either guard would let it react to that new session and redirect away before the password form ever renders, recreating the exact gap being closed.
- `supabase/config.toml`: also corrects `site_url`/`additional_redirect_urls`, found stale (`http://127.0.0.1:3000`, plus a `http`/`https` scheme mismatch between the two) and pointing nowhere the app actually runs. Fixed to `http://localhost:5173` — confirmed via a real browser, not just `curl`, that the local Vite dev server only accepts connections on `localhost`, not the `127.0.0.1` literal.
- `tests/acceptInvite.test.ts` (new): drives the full exchange against the real local stack rather than mocking it — invites through the existing `invite-user` Edge Function, polls Mailpit's REST API to fetch the sent email and regex out `token_hash`/`type`, calls `verifyOtp` then `updateUser`, and proves the password is actually durable (not just a transient session) via a fresh `signInWithPassword`.

**Verification:** `pnpm test` (29/29 passing) and `tsc -b` clean. Full manual walkthrough in a real browser: signed in as Alice (team lead), sent an invite, opened Mailpit, clicked the templated link, landed on the set-password form itself (not bounced to `/dashboard` or `/`), set a password, redirected to `/dashboard`, signed out, and signed back in with the new password — confirming it persisted. Also confirmed reloading the same already-used invite link correctly shows an "invalid or expired" state instead of erroring, proving the `useRef` guard only suppresses `StrictMode`'s synthetic double-invoke and not a genuine second use.

**Remaining work (deliberately out of scope for this change):**
- `AcceptInvite`'s `verifyOtp`/`updateUser` core is mechanically identical to what a self-service "forgot password" flow would need (`type: 'recovery'` instead of `'invite'`), but no such flow exists yet — no `resetPasswordForEmail` call or entry point anywhere in the UI. Deferred rather than generalizing the page speculatively; revisit if/when self-service password reset is actually requested.
