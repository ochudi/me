-- Adds featured-work flags and a testimonials table. Idempotent; run once in
-- the Supabase SQL editor after 0001.

-- ---------------------------------------------------------------------------
-- Featured work: pick which case studies surface on the homepage, and order.
-- ---------------------------------------------------------------------------
alter table public.ochudi_work
  add column if not exists featured boolean not null default false;
alter table public.ochudi_work
  add column if not exists featured_order integer;

-- ---------------------------------------------------------------------------
-- Testimonials
-- ---------------------------------------------------------------------------
create table if not exists public.ochudi_testimonials (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  quote text not null,
  author text not null,
  role text,
  company text,
  url text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger (function defined in 0001)
drop trigger if exists touch_ochudi_testimonials on public.ochudi_testimonials;
create trigger touch_ochudi_testimonials
  before update on public.ochudi_testimonials
  for each row execute function public.ochudi_touch_updated_at();

-- RLS: public reads published rows, admins do everything.
alter table public.ochudi_testimonials enable row level security;

drop policy if exists ochudi_testimonials_public_read on public.ochudi_testimonials;
create policy ochudi_testimonials_public_read on public.ochudi_testimonials
  for select using (published = true);

drop policy if exists ochudi_testimonials_admin_all on public.ochudi_testimonials;
create policy ochudi_testimonials_admin_all on public.ochudi_testimonials
  for all using (public.ochudi_is_admin()) with check (public.ochudi_is_admin());
