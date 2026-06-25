-- Extend style_profiles with structured learned prefs + per-style scores (matches app StyleProfile shape).

alter table public.style_profiles
  add column if not exists learned_colors text[] not null default '{}';

alter table public.style_profiles
  add column if not exists learned_categories text[] not null default '{}';

alter table public.style_profiles
  add column if not exists learned_brands text[] not null default '{}';

alter table public.style_profiles
  add column if not exists style_score jsonb not null default '{}'::jsonb;

comment on column public.style_profiles.style_score is 'Map of style preference → 0-100 (e.g. {"minimalist":72}).';
