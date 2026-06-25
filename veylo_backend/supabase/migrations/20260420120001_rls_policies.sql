-- Row Level Security — owner-only access

alter table public.profiles enable row level security;
alter table public.style_profiles enable row level security;
alter table public.clothing_items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_events enable row level security;
alter table public.try_on_history enable row level security;
alter table public.scan_queue enable row level security;
alter table public.embeddings enable row level security;

-- Profiles
drop policy if exists "veylo_profiles_select_own" on public.profiles;
drop policy if exists "veylo_profiles_update_own" on public.profiles;
drop policy if exists "veylo_profiles_insert_own" on public.profiles;
create policy "veylo_profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "veylo_profiles_update_own" on public.profiles for update using (id = auth.uid());
create policy "veylo_profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

-- Style profiles
drop policy if exists "veylo_style_profiles_all_own" on public.style_profiles;
create policy "veylo_style_profiles_all_own" on public.style_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Clothing items
drop policy if exists "veylo_clothing_items_all_own" on public.clothing_items;
create policy "veylo_clothing_items_all_own" on public.clothing_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Outfits
drop policy if exists "veylo_outfits_all_own" on public.outfits;
create policy "veylo_outfits_all_own" on public.outfits for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Outfit items — outfit must belong to user
drop policy if exists "veylo_outfit_items_all_own" on public.outfit_items;
create policy "veylo_outfit_items_all_own" on public.outfit_items for all
  using (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
  );

-- Events
drop policy if exists "veylo_outfit_events_all_own" on public.outfit_events;
create policy "veylo_outfit_events_all_own" on public.outfit_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Try-on
drop policy if exists "veylo_try_on_history_all_own" on public.try_on_history;
create policy "veylo_try_on_history_all_own" on public.try_on_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Scan queue
drop policy if exists "veylo_scan_queue_all_own" on public.scan_queue;
create policy "veylo_scan_queue_all_own" on public.scan_queue for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Embeddings
drop policy if exists "veylo_embeddings_all_own" on public.embeddings;
create policy "veylo_embeddings_all_own" on public.embeddings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Storage objects: first path segment must equal auth.uid()
-- -----------------------------------------------------------------------------
drop policy if exists "veylo_item_photos_select" on storage.objects;
drop policy if exists "veylo_item_photos_insert" on storage.objects;
drop policy if exists "veylo_item_photos_update" on storage.objects;
drop policy if exists "veylo_item_photos_delete" on storage.objects;
create policy "veylo_item_photos_select" on storage.objects for select
  using (bucket_id = 'item-photos' and split_part(name, '/', 1) = auth.uid()::text);
create policy "veylo_item_photos_insert" on storage.objects for insert
  with check (bucket_id = 'item-photos' and split_part(name, '/', 1) = auth.uid()::text);
create policy "veylo_item_photos_update" on storage.objects for update
  using (bucket_id = 'item-photos' and split_part(name, '/', 1) = auth.uid()::text);
create policy "veylo_item_photos_delete" on storage.objects for delete
  using (bucket_id = 'item-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "veylo_avatars_all" on storage.objects;
create policy "veylo_avatars_all" on storage.objects for all
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "veylo_tryon_results_all" on storage.objects;
create policy "veylo_tryon_results_all" on storage.objects for all
  using (bucket_id = 'tryon-results' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'tryon-results' and split_part(name, '/', 1) = auth.uid()::text);
