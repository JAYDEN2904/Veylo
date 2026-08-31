import {
  filterItemsForOccasion,
  getOccasionProfile,
  isBannedForOccasion,
  isGenderCoherentWithPicked,
  scoreOccasionFit,
} from './occasionProfiles';

describe('occasionProfiles', () => {
  const formalSneaker = {
    id: '1',
    category: 'shoes',
    tags: ['sneaker', 'athletic'],
    formalityScore: 1,
    genderAffinity: 'unisex' as const,
  };

  const oxford = {
    id: '2',
    category: 'shoes',
    tags: ['oxford', 'formal'],
    formalityScore: 4,
    genderAffinity: 'men' as const,
  };

  const handbag = {
    id: '3',
    category: 'accessory',
    tags: ['handbag'],
    formalityScore: 3,
    genderAffinity: 'women' as const,
  };

  it('bans athletic sneakers for Formal', () => {
    const profile = getOccasionProfile('Formal');
    expect(profile).not.toBeNull();
    expect(isBannedForOccasion(formalSneaker, profile!)).toBe(true);
    expect(isBannedForOccasion(oxford, profile!)).toBe(false);
  });

  it('scores formal shoes higher than sneakers for Formal', () => {
    const profile = getOccasionProfile('Formal')!;
    expect(scoreOccasionFit(oxford, profile)).toBeGreaterThan(
      scoreOccasionFit(formalSneaker, profile)
    );
  });

  it('filters banned items out of Formal pool', () => {
    const profile = getOccasionProfile('Formal')!;
    const filtered = filterItemsForOccasion([formalSneaker, oxford], profile, { hardBan: true });
    expect(filtered.map((i) => i.id)).toEqual(['2']);
  });

  it('enforces gender coherence between men and women items', () => {
    expect(isGenderCoherentWithPicked(handbag, [oxford])).toBe(false);
    expect(isGenderCoherentWithPicked(handbag, [{ ...oxford, genderAffinity: 'unisex' }])).toBe(
      true
    );
  });

  it('boosts work items for Work occasion', () => {
    const profile = getOccasionProfile('Work')!;
    const blazer = {
      id: '4',
      category: 'outerwear',
      tags: ['blazer', 'work', 'business'],
      formalityScore: 3,
      occasionTags: ['work'],
    };
    const hoodie = {
      id: '5',
      category: 'top',
      tags: ['hoodie', 'gym'],
      formalityScore: 1,
      occasionTags: ['exercise'],
    };
    expect(scoreOccasionFit(blazer, profile)).toBeGreaterThan(scoreOccasionFit(hoodie, profile));
  });
});
