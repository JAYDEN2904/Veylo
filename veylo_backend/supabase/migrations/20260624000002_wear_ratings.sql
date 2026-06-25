-- B4: Post-wear rating system
-- Stores the 3-outcome rating captured after logging an outfit wear.

create table if not exists public.wear_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  outfit_event_id uuid references public.outfit_events (id) on delete set null,
  outfit_id uuid references public.outfits (id) on delete set null,
  outcomes text[] not null default '{}',
  -- 'compliments' | 'felt_great' | 'wear_again'
  rated_at timestamptz not null default now()
);

alter table public.wear_ratings enable row level security;

create policy "Users manage own wear ratings"
  on public.wear_ratings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists wear_ratings_user_id_idx on public.wear_ratings (user_id);
create index if not exists wear_ratings_rated_at_idx on public.wear_ratings (rated_at desc);

comment on table public.wear_ratings is
  'Post-wear feedback captured on next app open after logging a wear. Used to refine outfit recommendations.';
