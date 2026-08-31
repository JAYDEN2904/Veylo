import {
  filterItemsForOccasion,
  getOccasionProfile,
  isBannedForOccasion,
  isGenderCoherentWithPicked,
  normalizeOccasionKey,
  scoreOccasionFit,
} from './occasionProfiles.ts';
import { deriveGenderAffinity, gendersAreCompatible } from './itemMetadata.ts';

Deno.test('normalizeOccasionKey maps evening to Party', () => {
  if (normalizeOccasionKey('evening') !== 'Party') {
    throw new Error('evening should map to Party');
  }
  if (normalizeOccasionKey('formal') !== 'Formal') {
    throw new Error('formal should map to Formal');
  }
});

Deno.test('Formal bans sneakers', () => {
  const profile = getOccasionProfile('Formal');
  if (!profile) throw new Error('missing Formal profile');
  const sneaker = {
    id: '1',
    category: 'shoes',
    tags: ['sneaker'],
    formality_score: 1,
  };
  if (!isBannedForOccasion(sneaker, profile)) {
    throw new Error('sneaker should be banned for Formal');
  }
});

Deno.test('Work scores blazer above hoodie', () => {
  const profile = getOccasionProfile('Work');
  if (!profile) throw new Error('missing Work profile');
  const blazer = {
    id: '1',
    category: 'outerwear',
    tags: ['blazer', 'work'],
    formality_score: 3,
    occasion_tags: ['work'],
  };
  const hoodie = {
    id: '2',
    category: 'top',
    tags: ['hoodie', 'gym'],
    formality_score: 1,
  };
  if (scoreOccasionFit(blazer, profile) <= scoreOccasionFit(hoodie, profile)) {
    throw new Error('blazer should outscore hoodie for Work');
  }
});

Deno.test('filterItemsForOccasion drops banned items', () => {
  const profile = getOccasionProfile('Formal');
  if (!profile) throw new Error('missing Formal profile');
  const items = [
    { id: '1', category: 'shoes', tags: ['sneaker'], formality_score: 1 },
    { id: '2', category: 'shoes', tags: ['oxford'], formality_score: 4 },
  ];
  const filtered = filterItemsForOccasion(items, profile, { hardBan: true });
  if (filtered.length !== 1 || filtered[0].id !== '2') {
    throw new Error(`expected only oxford, got ${JSON.stringify(filtered)}`);
  }
});

Deno.test('gender coherence rejects men+women mix', () => {
  if (gendersAreCompatible('men', 'women')) {
    throw new Error('men/women should not be compatible');
  }
  const ok = isGenderCoherentWithPicked(
    { id: 'a', category: 'accessory', gender_affinity: 'women' },
    [{ id: 'b', category: 'shoes', gender_affinity: 'men' }]
  );
  if (ok) throw new Error('should reject women bag with men shoes');
});

Deno.test('deriveGenderAffinity maps handbag to women', () => {
  const g = deriveGenderAffinity({ category: 'accessory', subCategory: 'handbag' });
  if (g !== 'women') throw new Error(`expected women got ${g}`);
});
