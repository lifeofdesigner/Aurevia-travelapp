alter table public.coupons
  add column if not exists minimum_booking_value_minor public.money_minor;

create index if not exists coupons_minimum_booking_value_idx
  on public.coupons (minimum_booking_value_minor);
