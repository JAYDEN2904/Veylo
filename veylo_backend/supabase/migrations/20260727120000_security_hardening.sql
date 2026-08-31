-- Security hardening: spend-cap query index, storage limits, user_stats lock-down,
-- revoke EXECUTE on trigger SECURITY DEFINER helpers from PostgREST roles.

-- 1) api_usage index for daily spend sum
create index if not exists api_usage_created_at_idx on public.api_usage (created_at);
create index if not exists api_usage_user_fn_created_idx
  on public.api_usage (user_id, function_name, created_at);

-- 2) Storage bucket size + mime allowlists (blocks raw API bypass of client resize)
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MiB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('item-photos', 'avatars', 'feed-photos');

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MiB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'tryon-results';

-- 3) user_stats: clients may SELECT only; writes go through service role (gamification-events)
drop policy if exists "veylo_user_stats_own" on public.user_stats;
drop policy if exists "veylo_user_stats_insert_own" on public.user_stats;
drop policy if exists "veylo_user_stats_update_own" on public.user_stats;

create policy "veylo_user_stats_select_own" on public.user_stats
  for select
  using (auth.uid() = user_id);

-- 4) Trigger helpers must not be callable via /rest/v1/rpc
revoke execute on function public.veylo_handle_new_user() from anon, authenticated, public;
revoke execute on function public.veylo_on_outfit_event_gamification() from anon, authenticated, public;

-- rls_auto_enable may not exist on all environments; guard with DO block
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable' and p.pronargs = 0
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated, public';
  end if;
end $$;
