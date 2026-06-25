-- User-defined wardrobe collections

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists collections_user_lower_name_idx
  on public.collections (user_id, lower(trim(name)));

create index if not exists collections_user_id_idx on public.collections (user_id);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  item_id uuid not null references public.clothing_items (id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, item_id)
);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "veylo_collections_all_own" on public.collections;
create policy "veylo_collections_all_own" on public.collections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "veylo_collection_items_all_own" on public.collection_items;
create policy "veylo_collection_items_all_own" on public.collection_items for all
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
    and exists (
      select 1 from public.clothing_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );
