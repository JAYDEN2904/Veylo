-- B2: Add formality_score column to clothing_items
-- 1 = athletic/casual, 2 = casual, 3 = smart casual, 4 = formal
-- Assigned at scan time by the tag-item edge function; used by the
-- outfit scoring engine to enforce formality-delta ≤ 1 between items.

alter table public.clothing_items
  add column if not exists formality_score smallint
    check (formality_score >= 1 and formality_score <= 4);

comment on column public.clothing_items.formality_score is
  '1=athletic, 2=casual, 3=smart casual, 4=formal. Assigned by AI tagger.';
