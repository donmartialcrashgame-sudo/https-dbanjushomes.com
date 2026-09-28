-- DBH property public identifiers
alter table public.properties add column if not exists property_code text;
update public.properties
set property_code = 'DBH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
where property_code is null;
alter table public.properties alter column property_code set default ('DBH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)));
alter table public.properties alter column property_code set not null;
create unique index if not exists properties_property_code_key on public.properties(property_code);
