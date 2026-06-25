-- Try-on async polling + Realtime updates on try_on_history

alter table public.try_on_history
  alter column result_image_path drop not null;

alter table public.try_on_history
  add column if not exists replicate_prediction_id text;

alter table public.try_on_history
  add column if not exists status text;

alter table public.try_on_history
  add column if not exists error text;

-- Existing completed rows
update public.try_on_history
set status = 'succeeded'
where status is null;

alter table public.try_on_history
  alter column status set default 'succeeded';

alter table public.try_on_history
  alter column status set not null;

alter table public.try_on_history
  drop constraint if exists try_on_history_status_check;

alter table public.try_on_history
  add constraint try_on_history_status_check
  check (status in ('processing', 'succeeded', 'failed'));

create index if not exists try_on_history_prediction_idx
  on public.try_on_history (replicate_prediction_id)
  where replicate_prediction_id is not null;

do $$
begin
  alter publication supabase_realtime add table public.try_on_history;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
