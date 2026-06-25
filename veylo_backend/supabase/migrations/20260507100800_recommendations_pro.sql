-- Recommendation helpers used by Edge Functions + optional client RPC calls

create or replace function public.recommend_outfit(
  query_embedding vector(1536),
  occasion_filter text default null,
  season_filter text default null,
  match_count int default 10
)
returns table (
  item_id uuid,
  similarity double precision,
  category text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ci.id,
    (1 - (e.embedding <=> query_embedding))::double precision as similarity,
    ci.category
  from public.embeddings e
  join public.clothing_items ci on ci.id = e.entity_id
  where e.entity_type = 'item'
    and e.user_id = auth.uid()
    and ci.user_id = auth.uid()
    and ci.status = 'active'
    and (
      season_filter is null
      or ci.season @> array[season_filter]::text[]
      or cardinality(ci.season) = 0
    )
    and (
      occasion_filter is null
      or exists (
        select 1
        from unnest(ci.tags) as tag
        where lower(tag) like '%' || lower(occasion_filter) || '%'
      )
    )
  order by e.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 10), 50));
$$;

create or replace function public.style_match_score(target_user_id uuid default null)
returns int
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid uuid := coalesce(target_user_id, auth.uid());
  prefs text[];
  item_count int := 0;
  matching_items int := 0;
begin
  if uid is null then
    return 0;
  end if;

  if uid <> auth.uid() then
    raise exception 'forbidden';
  end if;

  select coalesce(preferences, '{}') into prefs
  from public.style_profiles
  where user_id = uid;

  select count(*) into item_count
  from public.clothing_items
  where user_id = uid and status = 'active';

  if item_count = 0 then
    return 0;
  end if;

  select count(*) into matching_items
  from public.clothing_items ci
  where ci.user_id = uid
    and ci.status = 'active'
    and cardinality(ci.tags) > 0
    and exists (
      select 1
      from unnest(ci.tags) tag
      cross join unnest(prefs) pref
      where lower(tag) like '%' || lower(pref) || '%'
    );

  return least(
    100,
    greatest(0, round((matching_items::numeric * 100.0 / item_count::numeric))::int)
  );
end;
$$;

create or replace function public.feed_for_user(
  feed_scope text default 'following',
  page_limit int default 20,
  page_offset int default 0
)
returns table (
  post_id uuid,
  author_id uuid,
  image_path text,
  caption text,
  visibility text,
  created_at timestamptz,
  likes_count bigint,
  liked_by_me boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.user_id,
    p.image_path,
    p.caption,
    p.visibility,
    p.created_at,
    coalesce((
      select count(*)::bigint from public.feed_likes l where l.post_id = p.id
    ), 0),
    exists (
      select 1 from public.feed_likes lx
      where lx.post_id = p.id and lx.user_id = auth.uid()
    )
  from public.feed_posts p
  where (
      (feed_scope = 'public' and p.visibility = 'public')
      or (
        feed_scope <> 'public'
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.followee_id = p.user_id
          )
        )
      )
    )
    and (
      p.user_id = auth.uid()
      or p.visibility = 'public'
      or (
        p.visibility = 'followers'
        and exists (
          select 1 from public.follows fx
          where fx.followee_id = p.user_id and fx.follower_id = auth.uid()
        )
      )
    )
  order by p.created_at desc
  limit greatest(1, least(coalesce(page_limit, 20), 50))
  offset greatest(coalesce(page_offset, 0), 0);
$$;

grant execute on function public.recommend_outfit(vector, text, text, int) to authenticated;
grant execute on function public.style_match_score(uuid) to authenticated;
grant execute on function public.feed_for_user(text, int, int) to authenticated;
