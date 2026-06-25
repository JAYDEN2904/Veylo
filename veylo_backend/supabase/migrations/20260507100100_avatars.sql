-- Avatar generations / external provider linkage

create table if not exists public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'ready_player_me',
  external_id text,
  model_url text,
  thumbnail_path text,
  body_type text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'active', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists avatars_user_id_idx on public.avatars (user_id, created_at desc);

alter table public.avatars enable row level security;

drop policy if exists "veylo_avatars_all_own" on public.avatars;
create policy "veylo_avatars_all_own" on public.avatars
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
