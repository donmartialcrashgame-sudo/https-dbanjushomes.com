create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text,
  role text not null default 'customer' check (role in ('customer','agent','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, title text not null, description text,
  property_type text not null check (property_type in ('house','land','commercial')),
  category text, price numeric(18,2), currency text not null default 'NGN',
  state text, lga text, city text, area text, address text,
  land_size numeric(14,2), land_size_unit text default 'sqm',
  bedrooms integer, bathrooms integer, parking_spaces integer,
  is_featured boolean not null default false, is_published boolean not null default false,
  is_verified boolean not null default false,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','needs_information')),
  verification_id text unique, verified_at timestamptz, verification_note text,
  provider_name text not null default 'D Banjus Homes Nig Ltd',
  provider_verified boolean not null default false,
  seo_title text, seo_description text, seo_keywords text[], canonical_url text, og_image_url text,
  demo_only boolean not null default false, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  image_url text not null, alt_text text, sort_order integer not null default 0,
  is_cover boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  document_type text not null, document_reference text, issuing_authority text,
  issue_date date, expiry_date date, storage_path text, public_preview_url text,
  status text not null default 'pending' check (status in ('pending','verified','rejected','needs_information')),
  is_demo_document boolean not null default false, uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.property_document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.property_documents(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('verified','rejected','needs_information')),
  notes text, reviewed_at timestamptz not null default now()
);

create index if not exists properties_published_idx on public.properties(is_published);
create index if not exists properties_type_idx on public.properties(property_type);
create index if not exists properties_location_idx on public.properties(state,lga,city,area);
create index if not exists property_images_property_idx on public.property_images(property_id,sort_order);
create index if not exists property_documents_property_idx on public.property_documents(property_id);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.property_documents enable row level security;
alter table public.property_document_reviews enable row level security;

create or replace function public.is_dbh_admin() returns boolean
language sql stable security definer set search_path=public as $$
select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active=true);
$$;
revoke execute on function public.is_dbh_admin() from public;

drop policy if exists "Public can read published properties" on public.properties;
create policy "Public can read published properties" on public.properties for select to anon,authenticated using (is_published=true);
drop policy if exists "Admins manage properties" on public.properties;
create policy "Admins manage properties" on public.properties for all to authenticated using (public.is_dbh_admin()) with check (public.is_dbh_admin());

drop policy if exists "Public can read images of published properties" on public.property_images;
create policy "Public can read images of published properties" on public.property_images for select to anon,authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.is_published=true));
drop policy if exists "Admins manage property images" on public.property_images;
create policy "Admins manage property images" on public.property_images for all to authenticated using (public.is_dbh_admin()) with check (public.is_dbh_admin());

drop policy if exists "Admins manage property documents" on public.property_documents;
create policy "Admins manage property documents" on public.property_documents for all to authenticated using (public.is_dbh_admin()) with check (public.is_dbh_admin());
drop policy if exists "Admins manage document reviews" on public.property_document_reviews;
create policy "Admins manage document reviews" on public.property_document_reviews for all to authenticated using (public.is_dbh_admin()) with check (public.is_dbh_admin());

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using (id=auth.uid() or public.is_dbh_admin());
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all to authenticated using (public.is_dbh_admin()) with check (public.is_dbh_admin());

insert into public.properties (slug,title,description,property_type,category,price,currency,state,lga,city,area,address,land_size,land_size_unit,bedrooms,bathrooms,parking_spaces,is_featured,is_published,is_verified,verification_status,verification_id,verified_at,verification_note,provider_name,provider_verified,seo_title,seo_description,seo_keywords,canonical_url,og_image_url,demo_only)
values ('dbh-demo-modern-residence-lagos','DBH Demo Modern Residence','Demonstration property used to test the DBH property marketplace, verification badge and SEO property page. This listing is a demo and is not an offer for sale.','house','Residential Property',85000000,'NGN','Lagos','Lagos Mainland','Lagos','Lagos Mainland','DBH Demo Address, Lagos, Nigeria',650,'sqm',4,4,2,true,true,true,'verified','DBH-DEMO-0001',now(),'DEMO VERIFICATION ONLY — this record is for website testing and does not certify legal ownership or title.','D Banjus Homes Nig Ltd',true,'DBH Demo Modern Residence in Lagos | D Banjus Homes','Demo DBH property listing in Lagos with property details, images and verification-status demonstration.',array['property for sale Lagos','houses for sale Lagos','DBH Homes','D Banjus Homes'],'https://dbanjushomes.com/property/dbh-demo-modern-residence-lagos','https://www.superiteafrica.com/uploads/property/1754279608IMG_0460.JPG',true)
on conflict(slug) do update set is_published=excluded.is_published,is_verified=excluded.is_verified,verification_status=excluded.verification_status,verification_id=excluded.verification_id,provider_verified=excluded.provider_verified,demo_only=excluded.demo_only,updated_at=now();

insert into public.property_images(property_id,image_url,alt_text,sort_order,is_cover)
select id,'https://www.superiteafrica.com/uploads/property/1754279608IMG_0460.JPG','DBH demo modern property in Lagos',0,true from public.properties where slug='dbh-demo-modern-residence-lagos'
and not exists(select 1 from public.property_images where property_id=public.properties.id and is_cover=true);

insert into public.property_documents(property_id,document_type,document_reference,issuing_authority,status,is_demo_document)
select id,'Demo Verification Record','DBH-DEMO-DOC-0001','DBH Test Environment','verified',true from public.properties where slug='dbh-demo-modern-residence-lagos'
and not exists(select 1 from public.property_documents where property_id=public.properties.id and is_demo_document=true);