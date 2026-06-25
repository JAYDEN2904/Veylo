-- Veylo — backend extras: ops tables, indexes, and recommendation RPCs

-- -----------------------------------------------------------------------------
-- Ops tables
-- -----------------------------------------------------------------------------

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_label text,
  created_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error text,
  unique (user_id)
);

create table if not exists public.weather_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists weather_cache_expires_idx on public.weather_cache (expires_at);

-- Per-user external API call ledger so we can attach rate limits and bill insights later.
create table if not exists public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  function_name text not null,
  provider text not null check (provider in ('openai', 'replicate', 'openweather', 'internal')),
  units numeric not null default 1,
  cost_usd numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_user_created_idx on public.api_usage (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS — owner-only on user-scoped tables; weather_cache + api_usage are server-only.
-- -----------------------------------------------------------------------------
alter table public.push_tokens enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.weather_cache enable row level security;
alter table public.api_usage enable row level security;

drop policy if exists "veylo_push_tokens_all_own" on public.push_tokens;
create policy "veylo_push_tokens_all_own" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "veylo_deletion_requests_all_own" on public.account_deletion_requests;
create policy "veylo_deletion_requests_all_own" on public.account_deletion_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- weather_cache and api_usage have RLS enabled with NO policies → only service_role can touch them.

-- -----------------------------------------------------------------------------
-- Performance indexes
-- -----------------------------------------------------------------------------
create index if not exists clothing_items_tags_gin_idx on public.clothing_items using gin (tags);
create index if not exists clothing_items_colors_gin_idx on public.clothing_items using gin (colors);
create index if not exists clothing_items_season_gin_idx on public.clothing_items using gin (season);
create index if not exists outfits_tags_gin_idx on public.outfits using gin (tags);

-- pgvector: lists=100 is fine for v1; tune up to sqrt(rows) once real data lands.
create index if not exists embeddings_vector_idx
  on public.embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists embeddings_user_entity_idx
  on public.embeddings (user_id, entity_type);

-- -----------------------------------------------------------------------------
-- Recommendation RPCs
-- -----------------------------------------------------------------------------

-- Top-N items by cosine similarity for a given query embedding.
-- Restricted to caller's own items via auth.uid() check.
create or replace function public.match_items(
  query_embedding vector(1536),
  match_count int default 10,
  similarity_threshold double precision default 0.0
)
returns table (
  item_id uuid,
  category text,
  similarity double precision
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
    select
      ci.id as item_id,
      ci.category,
      1 - (e.embedding <=> query_embedding) as similarity
    from public.embeddings e
    join public.clothing_items ci on ci.id = e.entity_id
    where e.entity_type = 'item'
      and e.user_id = auth.uid()
      and ci.user_id = auth.uid()
      and ci.status = 'active'
      and (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
    order by e.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Aggregate stats for the Analytics screen.
create or replace function public.wardrobe_stats(target_user_id uuid default null)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := coalesce(target_user_id, auth.uid());
  result jsonb;
begin
  if uid is null then
    return '{}'::jsonb;
  end if;

  if uid <> auth.uid() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'total_items', (select count(*) from public.clothing_items where user_id = uid and status = 'active'),
    'total_outfits', (select count(*) from public.outfits where user_id = uid),
    'category_counts', (
      select coalesce(jsonb_object_agg(category, c), '{}'::jsonb)
      from (
        select category, count(*)::int as c
        from public.clothing_items
        where user_id = uid and status = 'active'
        group by category
      ) t
    ),
    'color_counts', (
      select coalesce(jsonb_object_agg(color, c), '{}'::jsonb)
      from (
        select unnest(colors) as color, count(*)::int as c
        from public.clothing_items
        where user_id = uid and status = 'active'
        group by color
      ) t
    ),
    'season_counts', (
      select coalesce(jsonb_object_agg(season, c), '{}'::jsonb)
      from (
        select unnest(season) as season, count(*)::int as c
        from public.clothing_items
        where user_id = uid and status = 'active' and array_length(season, 1) > 0
        group by season
      ) t
    ),
    'underworn_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'category', category,
        'last_worn', last_worn,
        'worn_count', worn_count
      )), '[]'::jsonb)
      from (
        select id, category, last_worn, worn_count
        from public.clothing_items
        where user_id = uid
          and status = 'active'
          and (last_worn is null or last_worn < now() - interval '60 days')
        order by coalesce(last_worn, '1970-01-01'::timestamptz) asc
        limit 20
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- Style gap analysis: which essential categories are missing from the wardrobe.
-- "Essentials" baseline keeps it deterministic for v1; can be personalised later.
create or replace function public.find_style_gaps(target_user_id uuid default null)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := coalesce(target_user_id, auth.uid());
  essentials text[] := array['top', 'bottom', 'shoes', 'outerwear', 'accessory'];
  owned text[];
  missing text[];
  user_prefs text[];
begin
  if uid is null then
    return '[]'::jsonb;
  end if;

  if uid <> auth.uid() then
    raise exception 'forbidden';
  end if;

  select array_agg(distinct lower(category))
    into owned
    from public.clothing_items
    where user_id = uid and status = 'active';

  owned := coalesce(owned, '{}'::text[]);

  select array_agg(g)
    into missing
    from unnest(essentials) g
    where g <> all (owned);

  select preferences
    into user_prefs
    from public.style_profiles
    where user_id = uid;

  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'category', m,
        'priority', case when m in ('top', 'bottom', 'shoes') then 'high' else 'medium' end,
        'reason', 'Essential category missing from your wardrobe',
        'matches_style', user_prefs
      ))
      from unnest(missing) m
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.match_items(vector, int, double precision) to authenticated;
grant execute on function public.wardrobe_stats(uuid) to authenticated;
grant execute on function public.find_style_gaps(uuid) to authenticated;
