-- Server-side errors + rate limit ledger (RLS on, no policies → service_role only)

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  function_name text,
  message text,
  stack text,
  context jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users (id) on delete set null
);

create index if not exists error_logs_created_idx on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

create table if not exists public.rate_limits (
  cache_key text not null,
  window_start timestamptz not null,
  request_count int not null default 1,
  primary key (cache_key, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
