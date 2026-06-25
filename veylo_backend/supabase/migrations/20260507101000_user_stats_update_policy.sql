-- Allow users to update their own stats row (gamification Edge + future client writes).

drop policy if exists "veylo_user_stats_update_own" on public.user_stats;
create policy "veylo_user_stats_update_own" on public.user_stats
  for update using (user_id = auth.uid());
