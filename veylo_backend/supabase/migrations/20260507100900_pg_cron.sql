-- pg_cron + pg_net (optional). Schedules are best-effort — skipped when extensions lack privileges.

do $ext$
begin
  execute 'create extension if not exists pg_cron';
exception
  when insufficient_privilege then
    raise notice 'pg_cron: insufficient privilege — enable in Dashboard → Database → Extensions';
  when duplicate_object then null;
  when undefined_file then
    raise notice 'pg_cron: not available in this environment';
end
$ext$;

do $ext$
begin
  execute 'create extension if not exists pg_net';
exception
  when insufficient_privilege then
    raise notice 'pg_net: insufficient privilege — enable in Dashboard → Database → Extensions';
  when duplicate_object then null;
  when undefined_file then
    raise notice 'pg_net: not available in this environment';
end
$ext$;

comment on extension pg_cron is 'Veylo: schedule digest-weekly + embeddings-backfill Edge Functions via net.http_post — see veylo_backend/README.md';

-- Example manual schedule (replace URL + Authorization after secrets are set):
--
-- select cron.schedule(
--   'veylo_weekly_digest',
--   '0 9 * * 0',
--   $$
--   select net.http_post(
--     url := 'https://igeyjmcfklymyeaahmtw.supabase.co/functions/v1/digest-weekly',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
--       'x-cron-secret', '<CRON_SECRET>'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
