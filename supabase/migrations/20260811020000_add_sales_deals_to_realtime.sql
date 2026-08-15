-- Enable Postgres Changes (realtime) for sales_deals so clients can subscribe
-- to INSERT/UPDATE/DELETE events. Views (e.g. sales_by_name) cannot be added
-- to a publication directly since logical replication only tracks tables.
alter publication supabase_realtime add table public.sales_deals;
