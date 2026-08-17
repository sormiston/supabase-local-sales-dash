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
