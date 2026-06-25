-- B5c: Add onboarding quiz answer columns and Style DNA label to style_profiles

alter table public.style_profiles
  add column if not exists style_archetype text
    check (style_archetype in ('minimal', 'bold', 'eclectic')),
  add column if not exists colour_preference text
    check (colour_preference in ('neutrals', 'earth_tones', 'brights', 'pastels', 'monochrome')),
  add column if not exists lifestyle_type text
    check (lifestyle_type in ('casual', 'professional', 'active')),
  add column if not exists climate_zone text
    check (climate_zone in ('tropical', 'temperate', 'cold', 'arid')),
  add column if not exists category_inclusions text[] default '{}',
  add column if not exists primary_goal text
    check (primary_goal in ('wear_more', 'buy_less', 'look_polished', 'save_time', 'express_myself')),
  add column if not exists style_dna_label text;

comment on column public.style_profiles.style_archetype is
  'Quiz answer: minimal | bold | eclectic';
comment on column public.style_profiles.colour_preference is
  'Quiz answer: neutrals | earth_tones | brights | pastels | monochrome';
comment on column public.style_profiles.lifestyle_type is
  'Quiz answer: casual | professional | active';
comment on column public.style_profiles.climate_zone is
  'Quiz answer: tropical | temperate | cold | arid';
comment on column public.style_profiles.primary_goal is
  'Quiz answer: wear_more | buy_less | look_polished | save_time | express_myself';
comment on column public.style_profiles.style_dna_label is
  'Derived 2-word Style DNA label (e.g. "The Quiet Dresser"). Computed client-side from archetype × lifestyle.';
