-- Points, streaks, badges

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  points int not null default 0,
  streak_days int not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

drop policy if exists "veylo_user_stats_own" on public.user_stats;
create policy "veylo_user_stats_own" on public.user_stats
  for select using (user_id = auth.uid());

drop policy if exists "veylo_user_stats_insert_own" on public.user_stats;
create policy "veylo_user_stats_insert_own" on public.user_stats
  for insert with check (user_id = auth.uid());

create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text,
  threshold_points int
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id text not null references public.badges (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "veylo_badges_select_authenticated" on public.badges;
create policy "veylo_badges_select_authenticated" on public.badges
  for select to authenticated using (true);

drop policy if exists "veylo_user_badges_own" on public.user_badges;
create policy "veylo_user_badges_own" on public.user_badges
  for select using (user_id = auth.uid());

insert into public.badges (id, name, description, threshold_points)
values
  ('first_outfit', 'First outfit', 'Logged your first calendar outfit', 0),
  ('collector_10', 'Collector', 'Added 10 wardrobe items', 50),
  ('week_warrior', 'Week warrior', 'Maintained a 7-day activity streak', 100),
  ('style_explorer', 'Style explorer', 'Earned 500 lifetime points', 500)
on conflict (id) do nothing;

-- Award points + streak when logging an outfit event (insert-only trigger).
create or replace function public.veylo_on_outfit_event_gamification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_stats as us (user_id, points, streak_days, last_active_date)
  values (new.user_id, 5, 1, new.date::date)
  on conflict (user_id) do update set
    points = us.points + 5,
    streak_days = case
      when us.last_active_date is null then 1
      when us.last_active_date = new.date then us.streak_days
      when us.last_active_date = new.date - 1 then us.streak_days + 1
      else 1
    end,
    last_active_date = greatest(coalesce(us.last_active_date, new.date), new.date),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists veylo_outfit_events_gamification on public.outfit_events;
create trigger veylo_outfit_events_gamification
  after insert on public.outfit_events
  for each row execute function public.veylo_on_outfit_event_gamification();
