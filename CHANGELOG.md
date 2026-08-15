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
