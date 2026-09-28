create type public.property_currency as enum ('NGN','USD','GBP','EUR','CAD');
alter table public.properties alter column currency drop default;
alter table public.properties alter column currency type public.property_currency using upper(coalesce(nullif(currency,''),'NGN'))::public.property_currency;
alter table public.properties alter column currency set default 'NGN';

create type public.property_verification_status as enum ('pending','verified','rejected','needs_information');
alter table public.properties drop constraint if exists properties_verification_status_check;
alter table public.properties alter column verification_status drop default;
alter table public.properties alter column verification_status type public.property_verification_status using coalesce(nullif(verification_status,''),'pending')::public.property_verification_status;
alter table public.properties alter column verification_status set default 'pending';

create type public.property_type as enum ('house','land','commercial');
alter table public.properties drop constraint if exists properties_property_type_check;
alter table public.properties alter column property_type drop default;
alter table public.properties alter column property_type type public.property_type using coalesce(nullif(property_type,''),'house')::public.property_type;

alter table public.properties
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists title_type text,
  add column if not exists furnishing text,
  add column if not exists property_condition text,
  add column if not exists year_built integer,
  add column if not exists amenities text[] not null default '{}',
  add column if not exists features text[] not null default '{}';

create index if not exists properties_location_idx on public.properties (latitude, longitude);