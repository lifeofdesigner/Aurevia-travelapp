alter table public.visa_products enable row level security;

create policy "visa_products_public_read"
on public.visa_products
for select
using (is_published and deleted_at is null);

create policy "visa_products_admin_manage"
on public.visa_products
for all
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));
