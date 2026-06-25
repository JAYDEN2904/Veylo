-- In-app notification inbox (distinct from Expo push_tokens)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "veylo_notifications_own" on public.notifications;
create policy "veylo_notifications_own" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
