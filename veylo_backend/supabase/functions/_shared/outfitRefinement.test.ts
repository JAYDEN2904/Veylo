import { applyRefinement, type OutfitCandidate } from './outfitRefinement.ts';

Deno.test('applyRefinement keeps algorithmic result when refinement is null', () => {
  const candidates: OutfitCandidate[] = [
    { index: 0, items: [], score: 80, reasoning: ['template'] },
  ];
  const out = applyRefinement(candidates, null);
  if (out.length !== 1 || out[0].reasoning[0] !== 'template') {
    throw new Error('null refinement should preserve candidates');
  }
});

Deno.test('applyRefinement drops rejected and rewrites reasoning', () => {
  const candidates: OutfitCandidate[] = [
    { index: 0, items: [], score: 90, reasoning: ['old'] },
    { index: 1, items: [], score: 70, reasoning: ['old2'] },
  ];
  const out = applyRefinement(candidates, [
    { index: 0, keep: true, reasoning: 'Navy blazer elevates the chinos.' },
    { index: 1, keep: false, reasoning: 'Too casual.' },
  ]);
  if (out.length !== 1) throw new Error(`expected 1 kept, got ${out.length}`);
  if (out[0].reasoning[0] !== 'Navy blazer elevates the chinos.') {
    throw new Error('reasoning not replaced');
  }
});

Deno.test('applyRefinement falls back to first candidate if all rejected', () => {
  const candidates: OutfitCandidate[] = [
    { index: 0, items: [], score: 90, reasoning: ['keep-me'] },
  ];
  const out = applyRefinement(candidates, [{ index: 0, keep: false, reasoning: 'nope' }]);
  if (out.length !== 1 || out[0].reasoning[0] !== 'keep-me') {
    throw new Error('should fall back to original top candidate');
  }
});
