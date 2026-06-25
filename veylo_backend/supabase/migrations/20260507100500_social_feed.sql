-- Style feed, follows, likes, comments + storage bucket feed-photos

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_path text not null,
  caption text,
  outfit_id uuid references public.outfits (id) on delete set null,
  visibility text not null default 'public'
    check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_posts_created_idx on public.feed_posts (created_at desc);
create index if not exists feed_posts_user_idx on public.feed_posts (user_id);

create table if not exists public.feed_post_items (
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  item_id uuid not null references public.clothing_items (id) on delete cascade,
  primary key (post_id, item_id)
);

create table if not exists public.feed_likes (
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists feed_likes_post_idx on public.feed_likes (post_id);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists feed_comments_post_idx on public.feed_comments (post_id, created_at);

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

insert into storage.buckets (id, name, public)
values ('feed-photos', 'feed-photos', false)
on conflict (id) do nothing;

alter table public.feed_posts enable row level security;
alter table public.feed_post_items enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_comments enable row level security;
alter table public.follows enable row level security;

-- feed_posts
drop policy if exists "veylo_feed_posts_select_visible" on public.feed_posts;
create policy "veylo_feed_posts_select_visible" on public.feed_posts for select using (
  user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'followers'
    and exists (
      select 1 from public.follows f
      where f.followee_id = feed_posts.user_id
        and f.follower_id = auth.uid()
    )
  )
);

drop policy if exists "veylo_feed_posts_insert_own" on public.feed_posts;
create policy "veylo_feed_posts_insert_own" on public.feed_posts for insert
  with check (user_id = auth.uid());

drop policy if exists "veylo_feed_posts_update_own" on public.feed_posts;
create policy "veylo_feed_posts_update_own" on public.feed_posts for update
  using (user_id = auth.uid());

drop policy if exists "veylo_feed_posts_delete_own" on public.feed_posts;
create policy "veylo_feed_posts_delete_own" on public.feed_posts for delete
  using (user_id = auth.uid());

-- feed_post_items
drop policy if exists "veylo_feed_post_items_all" on public.feed_post_items;
create policy "veylo_feed_post_items_all" on public.feed_post_items for all
  using (
    exists (
      select 1 from public.feed_posts p
      where p.id = post_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.feed_posts p
      where p.id = post_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.clothing_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- feed_likes
drop policy if exists "veylo_feed_likes_select" on public.feed_likes;
create policy "veylo_feed_likes_select" on public.feed_likes for select using (
  exists (
    select 1 from public.feed_posts p
    where p.id = post_id
      and (
        p.user_id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.followee_id = p.user_id and f.follower_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists "veylo_feed_likes_insert_own" on public.feed_likes;
create policy "veylo_feed_likes_insert_own" on public.feed_likes for insert
  with check (user_id = auth.uid());

drop policy if exists "veylo_feed_likes_delete_own" on public.feed_likes;
create policy "veylo_feed_likes_delete_own" on public.feed_likes for delete
  using (user_id = auth.uid());

-- feed_comments
drop policy if exists "veylo_feed_comments_select" on public.feed_comments;
create policy "veylo_feed_comments_select" on public.feed_comments for select using (
  exists (
    select 1 from public.feed_posts p
    where p.id = post_id
      and (
        p.user_id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.followee_id = p.user_id and f.follower_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists "veylo_feed_comments_insert_own" on public.feed_comments;
create policy "veylo_feed_comments_insert_own" on public.feed_comments for insert
  with check (user_id = auth.uid());

drop policy if exists "veylo_feed_comments_delete_own" on public.feed_comments;
create policy "veylo_feed_comments_delete_own" on public.feed_comments for delete
  using (user_id = auth.uid());

-- follows
drop policy if exists "veylo_follows_select_own" on public.follows;
create policy "veylo_follows_select_own" on public.follows for select using (
  follower_id = auth.uid() or followee_id = auth.uid()
);

drop policy if exists "veylo_follows_insert_follower" on public.follows;
create policy "veylo_follows_insert_follower" on public.follows for insert
  with check (follower_id = auth.uid());

drop policy if exists "veylo_follows_delete_follower" on public.follows;
create policy "veylo_follows_delete_follower" on public.follows for delete
  using (follower_id = auth.uid());

-- Storage: feed-photos/{uid}/...
drop policy if exists "veylo_feed_photos_select" on storage.objects;
create policy "veylo_feed_photos_select" on storage.objects for select
  using (bucket_id = 'feed-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "veylo_feed_photos_insert" on storage.objects;
create policy "veylo_feed_photos_insert" on storage.objects for insert
  with check (bucket_id = 'feed-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "veylo_feed_photos_update" on storage.objects;
create policy "veylo_feed_photos_update" on storage.objects for update
  using (bucket_id = 'feed-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "veylo_feed_photos_delete" on storage.objects;
create policy "veylo_feed_photos_delete" on storage.objects for delete
  using (bucket_id = 'feed-photos' and split_part(name, '/', 1) = auth.uid()::text);
