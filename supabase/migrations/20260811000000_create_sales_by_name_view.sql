create view "public"."sales_by_name" as
select
  name,
  sum(value) as total_value,
  count(*) as deal_count
from public.sales_deals
group by name;
