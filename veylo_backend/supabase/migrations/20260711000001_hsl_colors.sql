-- HSL colour storage + garment metadata columns

alter table public.clothing_items
  add column if not exists colors_hsl jsonb not null default '[]'::jsonb,
  add column if not exists material text,
  add column if not exists pattern text;

comment on column public.clothing_items.colors_hsl is 'Array of {h,s,l} objects — canonical colour storage';
comment on column public.clothing_items.material is 'Estimated fabric/material from Vision API';
comment on column public.clothing_items.pattern is 'Detected pattern e.g. solid, striped, floral';
