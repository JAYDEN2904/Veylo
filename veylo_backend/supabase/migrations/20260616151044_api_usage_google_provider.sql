-- Allow logging Vertex AI / Google Cloud usage in api_usage

alter table public.api_usage
  drop constraint if exists api_usage_provider_check;

alter table public.api_usage
  add constraint api_usage_provider_check
  check (provider in ('openai', 'replicate', 'openweather', 'internal', 'google'));
