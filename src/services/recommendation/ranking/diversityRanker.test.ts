import { item } from '../testFixtures';
import type { RankedOutfit } from '../types';
import { rerankForDiversity } from './diversityRanker';
import { calculateOutfitSimilarity } from './diversitySimilarity';

function ranked(
  id: string,
  items: ReturnType<typeof item>[],
  overall: number,
  personalization = overall
): RankedOutfit {
  return {
    id,
    items,
    score: {
      compatibility: overall,
      colourHarmony: overall,
      formality: overall,
      occasionFit: overall,
      weatherFit: 70,
      styleMatch: 70,
      wearDiversity: 70,
      personalization,
      novelty: 70,
      overall,
    },
    reasons: [{ type: 'wardrobe', text: 'A balanced look pulled from your wardrobe.' }],
    archetype: 'balanced',
    confidence: 80,
  };
}

const whiteTee = item({
  id: 'tee-white',
  category: 'Tops',
  subCategory: 't-shirt',
  colors: ['White'],
  tags: ['casual'],
});
const blackJeans = item({
  id: 'jeans-black',
  category: 'Bottoms',
  subCategory: 'jeans',
  colors: ['Black'],
  tags: ['casual', 'denim'],
});
const whiteSneakers = item({
  id: 'sneakers-white',
  category: 'Shoes',
  subCategory: 'sneakers',
  colors: ['White'],
  tags: ['casual'],
});
const blackSneakers = item({
  id: 'sneakers-black',
  category: 'Shoes',
  subCategory: 'sneakers',
  colors: ['Black'],
  tags: ['casual'],
});
const greySneakers = item({
  id: 'sneakers-grey',
  category: 'Shoes',
  subCategory: 'sneakers',
  colors: ['Grey'],
  tags: ['casual'],
});
const navyChinos = item({
  id: 'chinos-navy',
  category: 'Bottoms',
  subCategory: 'chinos',
  colors: ['Navy'],
  tags: ['smart', 'classic'],
});
const brownLoafers = item({
  id: 'loafers-brown',
  category: 'Shoes',
  subCategory: 'loafers',
  colors: ['Brown'],
  tags: ['classic'],
});
const oliveOvershirt = item({
  id: 'overshirt-olive',
  category: 'Tops',
  subCategory: 'overshirt',
  colors: ['Olive'],
  tags: ['casual'],
});

describe('calculateOutfitSimilarity', () => {
  it('is 1 for identical item sets', () => {
    const items = [whiteTee, blackJeans, whiteSneakers];
    expect(calculateOutfitSimilarity(items, [...items]).overall).toBe(1);
    expect(calculateOutfitSimilarity(items, items).itemIdentity).toBe(1);
  });

  it('stays well below 1 when only one item is shared', () => {
    const a = [whiteTee, blackJeans, whiteSneakers];
    const b = [whiteTee, navyChinos, brownLoafers];
    const similarity = calculateOutfitSimilarity(a, b);
    expect(similarity.itemIdentity).toBeLessThan(0.5);
    expect(similarity.overall).toBeLessThan(0.85);
  });

  it('works without embeddings', () => {
    const similarity = calculateOutfitSimilarity(
      [whiteTee, blackJeans],
      [oliveOvershirt, navyChinos]
    );
    expect(similarity.embedding).toBeNull();
    expect(Number.isFinite(similarity.overall)).toBe(true);
  });
});

describe('rerankForDiversity', () => {
  it('returns an empty list unchanged', () => {
    expect(rerankForDiversity([], 3).outfits).toEqual([]);
  });

  it('leaves a single result unchanged', () => {
    const only = ranked('a', [whiteTee, blackJeans], 90);
    expect(rerankForDiversity([only], 3).outfits).toEqual([only]);
  });

  it('does not force diversity on two results', () => {
    const a = ranked('a', [whiteTee, blackJeans, whiteSneakers], 96);
    const b = ranked('b', [whiteTee, blackJeans, blackSneakers], 94);
    const result = rerankForDiversity([a, b], 2);
    expect(result.outfits.map((outfit) => outfit.id)).toEqual(['a', 'b']);
    expect(result.stats.diversityApplied).toBe(false);
  });

  it('rejects exact duplicates when alternatives exist', () => {
    const a = ranked('a', [whiteTee, blackJeans, whiteSneakers], 96);
    const duplicate = ranked('b', [whiteTee, blackJeans, whiteSneakers], 94);
    const different = ranked('d', [oliveOvershirt, navyChinos, brownLoafers], 90);
    const result = rerankForDiversity([a, duplicate, different], 2);
    expect(result.outfits[0].id).toBe('a');
    expect(result.outfits.map((outfit) => outfit.id)).toContain('d');
    expect(result.outfits.map((outfit) => outfit.id)).not.toContain('b');
  });

  it('does not keep near-duplicate sneaker swaps at the top when alternatives exist', () => {
    const a = ranked('a', [whiteTee, blackJeans, whiteSneakers], 96);
    const b = ranked('b', [whiteTee, blackJeans, blackSneakers], 94);
    const c = ranked('c', [whiteTee, blackJeans, greySneakers], 93);
    const d = ranked('d', [oliveOvershirt, navyChinos, brownLoafers], 90);
    const result = rerankForDiversity([a, b, c, d], 3);
    expect(result.outfits[0].id).toBe('a');
    expect(result.outfits.map((outfit) => outfit.id)).toContain('d');
    const sneakerSwaps = result.outfits.filter((outfit) =>
      ['b', 'c'].includes(outfit.id)
    ).length;
    expect(sneakerSwaps).toBeLessThan(2);
  });

  it('protects high relevance from a low-scoring novelty', () => {
    const strong = ranked('strong', [whiteTee, blackJeans, whiteSneakers], 95);
    const alsoStrong = ranked('also', [oliveOvershirt, navyChinos, brownLoafers], 92);
    const weak = ranked('weak', [oliveOvershirt, blackJeans, greySneakers], 50);
    const result = rerankForDiversity([strong, alsoStrong, weak], 2);
    expect(result.outfits.map((outfit) => outfit.id)).not.toContain('weak');
    expect(result.outfits[0].id).toBe('strong');
  });

  it('keeps the personalized relevance winner first', () => {
    const personalized = ranked('p', [whiteTee, navyChinos, brownLoafers], 90, 96);
    const novel = ranked('n', [oliveOvershirt, blackJeans, greySneakers], 88, 70);
    const result = rerankForDiversity([personalized, novel], 2);
    expect(result.outfits[0].id).toBe('p');
    expect(result.outfits[0].score.personalization).toBe(96);
  });

  it('does not let a near-score novelty displace a personalized winner', () => {
    const personalized = ranked('p', [whiteTee, navyChinos, brownLoafers], 90, 96);
    const nearDuplicate = ranked('dup', [whiteTee, navyChinos, whiteSneakers], 89, 80);
    const novel = ranked('n', [oliveOvershirt, blackJeans, greySneakers], 88, 70);
    const result = rerankForDiversity([personalized, nearDuplicate, novel], 2);
    expect(result.outfits[0].id).toBe('p');
    expect(result.outfits[0].score.personalization).toBe(96);
    expect(result.outfits.map((outfit) => outfit.id)).toContain('n');
  });

  it('is deterministic', () => {
    const pool = [
      ranked('a', [whiteTee, blackJeans, whiteSneakers], 96),
      ranked('b', [whiteTee, blackJeans, blackSneakers], 94),
      ranked('c', [oliveOvershirt, navyChinos, brownLoafers], 91),
      ranked('d', [whiteTee, navyChinos, greySneakers], 89),
    ];
    const first = rerankForDiversity(pool, 3).outfits.map((outfit) =>
      outfit.items.map((entry) => entry.id).join('|')
    );
    const second = rerankForDiversity(pool, 3).outfits.map((outfit) =>
      outfit.items.map((entry) => entry.id).join('|')
    );
    expect(first).toEqual(second);
  });
});
