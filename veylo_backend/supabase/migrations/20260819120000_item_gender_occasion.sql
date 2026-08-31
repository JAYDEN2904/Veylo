-- Gender affinity + occasion tags for occasion-aware outfit scoring.
-- gender_affinity: men | women | unisex (null treated as unisex at score time)
-- occasion_tags: freeform keywords aligned with Today pills (casual, work, date, party, formal, exercise)

alter table public.clothing_items
  add column if not exists gender_affinity text
    check (gender_affinity is null or gender_affinity in ('men', 'women', 'unisex'));

alter table public.clothing_items
  add column if not exists occasion_tags text[] not null default '{}';

comment on column public.clothing_items.gender_affinity is
  'men | women | unisex — derived at tag time; unisex mixes with either.';

comment on column public.clothing_items.occasion_tags is
  'Occasion keywords (casual, work, date, party, formal, exercise) for outfit filtering.';

-- Keyword backfill from existing category / sub_category / tags / material / pattern.
-- Imperfect but immediately improves Today recommendations for current wardrobes.

with signals as (
  select
    id,
    lower(
      coalesce(category, '') || ' ' ||
      coalesce(sub_category, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '') || ' ' ||
      coalesce(material, '') || ' ' ||
      coalesce(pattern, '')
    ) as blob,
    formality_score
  from public.clothing_items
)
update public.clothing_items ci
set
  gender_affinity = case
    when s.blob ~ '(handbag|purse|heel|heels|stiletto|wedge|skirt|blouse|gown|dress|bra|lingerie|women|womens|lady)'
      then 'women'
    when s.blob ~ '(oxford|necktie|tie|suit jacket|mens|men''s|male|boxer)'
      and s.blob !~ '(women|womens|lady|handbag|purse|heel)'
      then 'men'
    else 'unisex'
  end,
  occasion_tags = (
    select coalesce(array_agg(distinct tag), '{}'::text[])
    from (
      select unnest(
        array_remove(
          array[
            case when s.blob ~ '(gym|athletic|sport|workout|running|training|activewear|yoga|sneaker)'
              then 'exercise' end,
            case when s.blob ~ '(suit|tuxedo|gown|black.?tie|formal|elegant|dressy|oxford|loafer|blazer)'
              or coalesce(s.formality_score, 2) >= 4
              then 'formal' end,
            case when s.blob ~ '(office|work|business|professional|chino|blazer|button.?down|collar)'
              or coalesce(s.formality_score, 2) = 3
              then 'work' end,
            case when s.blob ~ '(party|cocktail|evening|club|sparkle|sequin)'
              then 'party' end,
            case when s.blob ~ '(date|romantic|night out)'
              then 'date' end,
            case when s.blob ~ '(casual|everyday|weekend|jeans|tee|t-shirt|hoodie|sneaker)'
              or coalesce(s.formality_score, 2) <= 2
              then 'casual' end,
            -- Always ensure at least one tag from formality when nothing matched above
            case when coalesce(s.formality_score, 2) >= 4 then 'formal'
                 when coalesce(s.formality_score, 2) = 3 then 'work'
                 when coalesce(s.formality_score, 2) = 1 then 'exercise'
                 else 'casual' end
          ],
          null
        )
      ) as tag
    ) derived
  )
from signals s
where ci.id = s.id
  and (
    ci.gender_affinity is null
    or cardinality(ci.occasion_tags) = 0
  );
