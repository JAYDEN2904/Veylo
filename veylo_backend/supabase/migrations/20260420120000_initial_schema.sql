-- Veylo — core schema (run via Supabase SQL editor or `supabase db push`)
-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  body_type text,
  location text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.style_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferences text[] not null default '{}',
  learned_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Wardrobe & outfits
-- -----------------------------------------------------------------------------
create table if not exists public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_path text not null,
  category text not null,
  sub_category text,
  colors text[] not null default '{}',
  brand text,
  tags text[] not null default '{}',
  notes text,
  season text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'archived', 'donated')),
  worn_count int not null default 0,
  last_worn timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clothing_items_user_id_idx on public.clothing_items (user_id);

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  occasion text,
  image_path text,
  is_favorite boolean not null default false,
  feedback text,
  style_match_score double precision,
  fit_score double precision,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outfits_user_id_idx on public.outfits (user_id);

create table if not exists public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.clothing_items (id) on delete cascade,
  position int not null default 0,
  primary key (outfit_id, item_id)
);

create table if not exists public.outfit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  outfit_id uuid references public.outfits (id) on delete set null,
  occasion text,
  notes text,
  weather jsonb,
  is_recurring boolean not null default false,
  recurring_pattern text check (recurring_pattern is null or recurring_pattern in ('weekly', 'biweekly', 'monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outfit_events_user_date_idx on public.outfit_events (user_id, date);

create table if not exists public.try_on_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text,
  outfit_id uuid references public.outfits (id) on delete set null,
  input_image_path text,
  result_image_path text not null,
  items jsonb not null default '[]'::jsonb,
  rating int check (rating is null or (rating >= 1 and rating <= 5)),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists try_on_history_user_idx on public.try_on_history (user_id, created_at desc);

create table if not exists public.scan_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_path text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- pgvector: dimension matches text-embedding-3-large (3072) or adjust to your model
create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('item', 'outfit', 'style')),
  entity_id uuid not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

-- Vector index: create after you have representative data (ivfflat needs ANALYZE).
-- create index embeddings_vector_idx on public.embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- -----------------------------------------------------------------------------
-- New user → profile row
-- -----------------------------------------------------------------------------
create or replace function public.veylo_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  insert into public.style_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists veylo_on_auth_user_created on auth.users;
create trigger veylo_on_auth_user_created
  after insert on auth.users
  for each row execute function public.veylo_handle_new_user();

-- -----------------------------------------------------------------------------
-- Storage buckets (private; clients use signed URLs)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('item-photos', 'item-photos', false),
  ('avatars', 'avatars', false),
  ('tryon-results', 'tryon-results', false)
on conflict (id) do nothing;
