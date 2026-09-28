create table if not exists public.property_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  property_code text,
  property_title text,
  property_slug text,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reporter_type text not null,
  reason text not null,
  details text not null,
  occurred_on date,
  first_name text not null,
  surname text not null,
  company text,
  email text not null,
  status text not null default 'new' check (status in ('new','reviewing','resolved','dismissed')),
  report_reference text not null default ('#' || substr(md5(gen_random_uuid()::text),1,3) || '-' || substr(md5(gen_random_uuid()::text),4,3) || '-' || substr(md5(gen_random_uuid()::text),7,3)),
  created_at timestamptz not null default now()
);

create index if not exists property_reports_property_idx on public.property_reports(property_id);
create index if not exists property_reports_created_idx on public.property_reports(created_at desc);
create index if not exists property_reports_status_idx on public.property_reports(status);
create unique index if not exists property_reports_reference_uidx on public.property_reports(report_reference);

alter table public.property_reports enable row level security;

grant insert on public.property_reports to anon, authenticated;
grant select, update on public.property_reports to authenticated;

drop policy if exists "Anyone can submit a property report" on public.property_reports;
create policy "Anyone can submit a property report"
on public.property_reports for insert to anon, authenticated
with check (
  length(trim(details)) >= 100
  and length(trim(first_name)) >= 1
  and length(trim(surname)) >= 1
  and length(trim(email)) >= 3
  and (reporter_user_id is null or reporter_user_id = auth.uid())
);

drop policy if exists "Admins can read property reports" on public.property_reports;
create policy "Admins can read property reports"
on public.property_reports for select to authenticated
using (public.is_dbh_admin());

drop policy if exists "Admins can update property reports" on public.property_reports;
create policy "Admins can update property reports"
on public.property_reports for update to authenticated
using (public.is_dbh_admin())
with check (public.is_dbh_admin());
