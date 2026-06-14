-- ochudi.com content schema.
--
-- This database is shared across projects, so every object is prefixed
-- `ochudi_`. Run this in the Supabase SQL editor (or `supabase db push`)
-- once. It is idempotent: safe to re-run.
--
-- Security model: row-level security is ON for every table. The public
-- (anon) role can read only published rows. Writes require an authenticated
-- user whose email is listed in ochudi_admins. The app also gates /admin by
-- the ADMIN_EMAILS env var, but RLS is the real boundary — defense in depth.

-- ---------------------------------------------------------------------------
-- Admin allowlist + helpers
-- ---------------------------------------------------------------------------
create table if not exists public.ochudi_admins (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.ochudi_admins enable row level security;

-- True when the current request is an authenticated admin. SECURITY DEFINER
-- so the policy check can read the allowlist regardless of its own RLS.
create or replace function public.ochudi_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.ochudi_admins
    where email = (auth.jwt() ->> 'email')
  );
$$;

-- Only admins can see or change the allowlist.
drop policy if exists ochudi_admins_admin_all on public.ochudi_admins;
create policy ochudi_admins_admin_all on public.ochudi_admins
  for all using (public.ochudi_is_admin()) with check (public.ochudi_is_admin());

-- Keep updated_at fresh on every write.
create or replace function public.ochudi_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
create table if not exists public.ochudi_work (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  client text not null,
  year integer not null,
  role text not null,
  stack text[] not null default '{}',
  type text not null check (type in ('client','research','internal','side')),
  summary text not null,
  cover text not null default '',
  live_url text,
  status text not null check (status in ('live','internal','archived')),
  date date not null,
  body text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ochudi_writing (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  date date not null,
  tags text[] not null default '{}',
  body text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ochudi_teaching (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  week integer not null check (week >= 1),
  summary text not null,
  subjects text[] not null default '{}',
  prerequisites text[] not null default '{}',
  date date not null,
  body text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The /now page is a single row.
create table if not exists public.ochudi_now (
  id integer primary key default 1 check (id = 1),
  title text not null default 'Now',
  updated date not null,
  focus text not null,
  reading text not null,
  listening text,
  not_doing text,
  thinking text[] not null default '{}',
  body text not null default '',
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Free-form site settings (availability banner, contact, etc.).
create table if not exists public.ochudi_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'ochudi_work','ochudi_writing','ochudi_teaching','ochudi_now','ochudi_settings'
  ] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.ochudi_touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security: public reads published rows, admins do everything
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'ochudi_work','ochudi_writing','ochudi_teaching','ochudi_now','ochudi_settings'
  ] loop
    execute format('alter table public.%1$s enable row level security', t);
    execute format('drop policy if exists %1$s_public_read on public.%1$s', t);
    execute format('drop policy if exists %1$s_admin_all on public.%1$s', t);
    execute format(
      'create policy %1$s_admin_all on public.%1$s
       for all using (public.ochudi_is_admin()) with check (public.ochudi_is_admin())', t);
  end loop;
end $$;

-- Published-only public read for the collections.
create policy ochudi_work_public_read on public.ochudi_work
  for select using (published = true);
create policy ochudi_writing_public_read on public.ochudi_writing
  for select using (published = true);
create policy ochudi_teaching_public_read on public.ochudi_teaching
  for select using (published = true);
create policy ochudi_now_public_read on public.ochudi_now
  for select using (published = true);
-- Settings are world-readable (they drive public UI like the availability line).
create policy ochudi_settings_public_read on public.ochudi_settings
  for select using (true);

-- ---------------------------------------------------------------------------
-- Storage: a public bucket for cover images and other media
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ochudi-media', 'ochudi-media', true)
on conflict (id) do nothing;

drop policy if exists ochudi_media_public_read on storage.objects;
create policy ochudi_media_public_read on storage.objects
  for select using (bucket_id = 'ochudi-media');

drop policy if exists ochudi_media_admin_write on storage.objects;
create policy ochudi_media_admin_write on storage.objects
  for all using (bucket_id = 'ochudi-media' and public.ochudi_is_admin())
  with check (bucket_id = 'ochudi-media' and public.ochudi_is_admin());
