# Changelog

## 2026-08-11 — Unit testing for the supabase-js client

### Plan

#### Context

The project is a Vite + React 19 + TypeScript SPA (`pnpm`, ESM) with a local Supabase stack (`public.sales_deals` table + `public.sales_by_name` view, added in a prior session). There was no `@supabase/supabase-js` dependency, no test runner, and no test infrastructure at all — `src/` was still the unmodified Vite starter template.

The goal was unit tests that exercise the Supabase-generated REST API (PostgREST) through the `supabase-js` client — i.e. make real queries against the local stack and assert on the returned rows, rather than mocking anything. This becomes the project's primary means of testing the data API.

While investigating, a live check found that the `anon`/publishable role had **no `SELECT` grant** on either `sales_deals` or `sales_by_name` — a REST query returned `permission denied for table sales_deals` (code `42501`). This needed fixing via migration before any read test could pass; it was a real gap in the existing schema, not just a testing nicety.

Confirmed decisions:
- Fix the grants (grant `SELECT` to `anon`/`authenticated`) rather than introducing RLS/auth for this demo-scale app.
- Use **Vitest** (natural fit with the existing Vite toolchain).
- Configure via `.env.test` (actual local values) + `.env.example` (documents the required vars) rather than hardcoding.
- Tests read the existing seed data from `supabase/seed.sql` rather than managing their own fixtures. Confirmed aggregates from `sales_by_name`: John 5500, Alice 4200, Marcus 5800, Priya 10300 (8 rows total in `sales_deals`).
- Tests live in a top-level `tests/` directory, a sibling of `src/`, not nested inside it — tests are not source code and must never risk being pulled into the client bundle.
- No relative (`../`) imports between the two trees: `@` → `./src` and `@tests` → `./tests` path aliases.

#### Implementation steps (as planned)

1. **Fix REST grants (migration)** — `supabase/migrations/20260811010000_grant_select_sales.sql`:
   ```sql
   grant select on table "public"."sales_deals" to "anon", "authenticated";
   grant select on table "public"."sales_by_name" to "anon", "authenticated";
   ```
   Applied via `mcp__supabase__apply_migration`, then verified with a raw REST call.

2. **Add dependencies** — `@supabase/supabase-js` → `dependencies`, `vitest` → `devDependencies`.

3. **Env config** — `.env.example` (committed, documents `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`) and `.env.test` (committed, real local non-secret values). Vitest defaults to `mode: 'test'` and uses Vite's env loading, so `.env.test` is picked up automatically via `import.meta.env.VITE_*`.

4. **Shared Supabase client** — `src/lib/supabaseClient.ts`, reused by both the app (later) and the tests.

5. **Test location kept out of `src/`** — `tests/salesDeals.test.ts`, `tests/salesByName.test.ts`.

6. **Path aliases** (`@` → `src`, `@tests` → `tests`) — configured in `vite.config.ts` (`resolve.alias`, single source of truth, inherited by Vitest via `mergeConfig`), `tsconfig.app.json` (`paths`), and a new `tsconfig.test.json` covering `tests/`, referenced from root `tsconfig.json`.

7. **Vitest config** — new `vitest.config.ts`, merging `vite.config.ts`, `environment: 'node'` (pure REST/API calls, no DOM needed), `include: ['tests/**/*.test.ts']`.

8. **package.json scripts** — `"test": "vitest run"`, `"test:watch": "vitest"`.

9. **Tests**:
   - `tests/salesDeals.test.ts` — queries `sales_deals` via `supabase.from('sales_deals').select('*')`; asserts row count (8) and a known seed row.
   - `tests/salesByName.test.ts` — queries `sales_by_name`; asserts aggregated totals per name match seed-derived values.

#### Verification (planned)
1. `pnpm install` to pull in the new dependencies.
2. Apply the grants migration and re-verify with `curl` that the REST API returns data instead of `permission denied`.
3. `pnpm test` — all tests should pass against the live local stack.

### Implementation log

1. Created `supabase/migrations/20260811010000_grant_select_sales.sql` granting `SELECT` on `sales_deals` and `sales_by_name` to `anon`/`authenticated`; applied via MCP (`apply_migration`); verified with `curl` against both endpoints — both returned data instead of `permission denied`.
2. Installed `@supabase/supabase-js` (dependency) and `vitest` (devDependency) via `pnpm add`.
3. Created `.env.example` (placeholder-documented vars) and `.env.test` (real local URL + publishable key).
4. Created `src/lib/supabaseClient.ts` exporting a `createClient` instance built from `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Configured path aliases:
   - `vite.config.ts`: added `resolve.alias` for `@` → `./src` and `@tests` → `./tests` using `fileURLToPath(new URL(...))`.
   - `tsconfig.app.json`: added `"paths": { "@/*": ["./src/*"] }`.
   - New `tsconfig.test.json`: `paths` for both `@/*` and `@tests/*`, scoped to `"include": ["tests"]`.
   - `tsconfig.json`: added a `{ "path": "./tsconfig.test.json" }` reference.
6. Created `vitest.config.ts`, merging `vite.config.ts` via `mergeConfig`, with `environment: 'node'` and `include: ['tests/**/*.test.ts']`.
7. Added `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts.
8. Wrote `tests/salesDeals.test.ts` and `tests/salesByName.test.ts`, importing the shared client via the `@/lib/supabaseClient` alias and asserting against known seed data.
9. Ran `pnpm install` and `pnpm test` — **3/3 tests passed**.

#### Fixes made during verification (beyond the original plan)
- `vitest.config.ts`'s `import viteConfig from './vite.config'` triggered a Vite native-config-loader warning about missing file extensions; fixed by importing `./vite.config.ts` explicitly.
- `pnpm exec tsc -b` initially failed:
  - `baseUrl` is deprecated in TypeScript 6 under `moduleResolution: "bundler"` — removed `baseUrl` from `tsconfig.app.json` and `tsconfig.test.json` (paths alone are sufficient with the bundler resolution mode).
  - `tsconfig.test.json` originally included `"src"` in its `include` array (to make the `@` alias resolvable), which caused the test project to re-typecheck all of `src/` — including `App.tsx` — under compiler options lacking `jsx`/DOM lib, producing cascading `TS17004`/`TS2584` errors. Fixed by scoping `include` to `["tests"]` only; alias-resolved files pulled in via imports still typecheck correctly without bulk-including the whole `src/` tree.
  - `tsconfig.test.json` was missing `"skipLibCheck": true` (present in the project's other two tsconfig projects), causing TypeScript to check `.d.ts` files inside `node_modules` for `@supabase/*`, `vitest`, and `vite` packages, surfacing hundreds of ambient-DOM-global errors (`fetch`, `URL`, `AbortSignal`, etc.). Fixed by adding `"skipLibCheck": true` and `"types": ["node", "vite/client"]`.
- Final verification: `pnpm exec tsc -b` (clean), `pnpm test` (3/3 pass), `pnpm lint` via `oxlint` (clean, exit 0).

#### Files changed
- New: `supabase/migrations/20260811010000_grant_select_sales.sql`, `.env.example`, `.env.test`, `src/lib/supabaseClient.ts`, `tsconfig.test.json`, `vitest.config.ts`, `tests/salesDeals.test.ts`, `tests/salesByName.test.ts`
- Modified: `package.json`, `pnpm-lock.yaml`, `tsconfig.app.json`, `tsconfig.json`, `vite.config.ts`

## 2026-08-11 — Homepage: header + sales-by-name bar chart

### Context

This is the app's first real screen. Before this work, `src/App.tsx` was still the unmodified Vite+React starter template (counter button, Vite/React logos, doc links) — no Tailwind, no chart library, no app-specific components existed. `src/lib/supabaseClient.ts` (from a prior session) already provided a working `supabase` client reading `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, and the `public.sales_by_name` view (columns: `name`, `total_value`, `deal_count`) was already readable via the REST API (grants fixed in an earlier session).

The homepage needed an app header titled **"Supabase Local Sales Dash"** and a bar chart of `sales_by_name`, styled with TailwindCSS.

Confirmed decisions:
- **Chart library: Recharts** — built natively for React web (JSX API, SVG), ~48.9M weekly downloads, solid TS types, React 19 compatible, ~150kB. (Ruled out shadcn/ui Charts — a themed Recharts wrapper requiring the shadcn CLI/component setup — and Nivo — heavier bundle, less JSX-native API.)
- **Chart shows `total_value` only**, one bar per name. `deal_count` surfaces in the hover tooltip as supporting detail rather than a second bar/axis.
- **TailwindCSS v4**, installed via the `@tailwindcss/vite` plugin (CSS-first config, no `postcss.config.js`/`tailwind.config.js`).

Built following the loaded `dataviz` skill's procedure: single-measure categorical bar chart, color from the validated palette (one accent hue, no legend needed for a single series), mark specs (rounded bar ends, recessive gridlines), hover tooltip by default, and a final accessibility pass (accessible data table alongside the chart, dark-mode-aware colors validated against both surfaces).

### Implementation (as built)

#### 1. Dependencies
```
pnpm add recharts
pnpm add -D tailwindcss @tailwindcss/vite
```
Installed clean — Recharts 3.10.1 resolved against React 19.2.8 with **no peer-dependency warning**, so the planned `react-is` override fallback wasn't needed.

#### 2. Tailwind v4
- `vite.config.ts`: added `tailwindcss()` alongside `react()` in the plugins array.
- `src/index.css`: replaced the starter CSS with `@import "tailwindcss";` plus a `@theme` block of color tokens taken from the `dataviz` skill's `references/palette.md`, with a `prefers-color-scheme: dark` override block redefining the same custom properties. Tokens used: `--color-page`, `--color-surface`, `--color-ink-primary`, `--color-ink-secondary`, `--color-ink-muted`, `--color-gridline`, `--color-axis`, `--color-series-1` (categorical slot 1 "blue": `#2a78d6` light / `#3987e5` dark), `--color-border`.
- Deleted `src/App.css` and the unused starter assets (`react.svg`, `vite.svg`, `hero.png`) from `src/assets/`.
- `index.html` `<title>` updated to `Supabase Local Sales Dash`.

#### 3. Supabase TypeScript types
- Added `"db:generate-types": "supabase gen types typescript --local --schema public > src/lib/database.types.ts"` to `package.json`.
- `src/lib/supabaseClient.ts` updated to `createClient<Database>(...)`.

#### 4. Data-fetching hook
`src/hooks/useSalesByName.ts` — `useEffect`/`useState` hook wrapping `supabase.from('sales_by_name').select('*').order('total_value', { ascending: false })`, returning `{ data, loading, error }`, typed via `Database['public']['Views']['sales_by_name']['Row']`. Guards against race fetches and dedeupes state settings via `AbortController` pattern: `signal` is passed to the query via `.abortSignal(...)`, and the effect's cleanup calls `controller.abort()`, so the underlying `fetch` is cancelled.

#### 5. Components
- `src/components/AppHeader.tsx` — Tailwind-styled header bar with the app title.
- `src/components/SalesByNameChart.tsx` — `ResponsiveContainer` > `BarChart`: hairline `CartesianGrid` (horizontal only), `XAxis`/`YAxis` styled with muted/axis tokens, `Bar dataKey="total_value"` filled with `var(--color-series-1)`, `radius={[4,4,0,0]}` (rounded top, square baseline), `maxBarSize={24}`, direct value labels via `LabelList` (comma-formatted, ink-secondary color — text never wears the series color), custom `Tooltip` content (value bold/primary, name secondary, deal count muted) with a light hover-cursor wash. Loading/error/empty states handled inline.

#### 6. Homepage composition
`src/App.tsx` rewritten to render `<AppHeader />` then a `<main>` containing a "Sales by name" heading and `<SalesByNameChart />`, laid out with Tailwind (`min-h-screen bg-page`, centered `max-w-5xl` container, padding). `src/main.tsx` unchanged.

### Verification results
1. **Palette validation** (`node scripts/validate_palette.js`) — `#2a78d6` on light surface `#fcfcfb` and `#3987e5` on dark surface `#1a1a19`: **ALL CHECKS PASS** in both modes.
2. `pnpm exec tsc -b` — clean (after the `LabelList` formatter type fix above).
3. `pnpm lint` (oxlint) — clean.
4. `pnpm test` — 3/3 existing Vitest tests still pass, unaffected.
5. `pnpm build` — succeeds; one non-blocking warning that the main JS chunk is ~759kB (mostly Recharts) — not addressed, noted as a future code-splitting candidate if it becomes a problem.
6. Dev server smoke check: confirmed `index.html` serves the correct `<title>`, and `main.tsx`/`App.tsx`/`SalesByNameChart.tsx` all transform without error through Vite.
   - **Gap**: this environment has no `chromium-cli` or `claude-in-chrome` available, so the chart was **not visually screenshotted/confirmed in an actual browser** during the original build — only static/compile-time checks were run.


#### Files changed
- New: `src/lib/database.types.ts`, `src/hooks/useSalesByName.ts`, `src/components/AppHeader.tsx`, `src/components/SalesByNameChart.tsx`, `.env.local`
- Modified: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `src/index.css`, `index.html`, `src/lib/supabaseClient.ts`, `src/App.tsx`
- Deleted: `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`

