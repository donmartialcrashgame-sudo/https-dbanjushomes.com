alter table public.user_onboarding
  add column if not exists preferred_property_type text,
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists purchase_timeline text,
  add column if not exists preferred_location text,
  add column if not exists preferred_state text,
  add column if not exists preferred_country text,
  add column if not exists preferred_city text,
  add column if not exists preferred_area text,
  add column if not exists preferred_latitude double precision,
  add column if not exists preferred_longitude double precision,
  add column if not exists preferred_google_place_id text,
  add column if not exists contact_preference text;
