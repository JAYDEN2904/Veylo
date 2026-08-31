import { deriveGenderAffinity, deriveOccasionTags, gendersAreCompatible } from './itemMetadata';

describe('itemMetadata', () => {
  it('derives women from handbag / heels', () => {
    expect(
      deriveGenderAffinity({ category: 'accessory', subCategory: 'handbag', styleTags: [] })
    ).toBe('women');
    expect(deriveGenderAffinity({ category: 'shoes', subCategory: 'heel', styleTags: [] })).toBe(
      'women'
    );
  });

  it('derives men from oxford / necktie', () => {
    expect(deriveGenderAffinity({ category: 'shoes', subCategory: 'oxford', styleTags: [] })).toBe(
      'men'
    );
  });

  it('defaults to unisex for plain tees', () => {
    expect(
      deriveGenderAffinity({ category: 'top', subCategory: 'tee', styleTags: ['casual'] })
    ).toBe('unisex');
  });

  it('derives formal occasion tags from suit language', () => {
    const tags = deriveOccasionTags({
      category: 'outerwear',
      styleTags: ['suit', 'formal'],
      formalityScore: 4,
    });
    expect(tags).toContain('formal');
  });

  it('treats unisex as compatible with men or women', () => {
    expect(gendersAreCompatible('unisex', 'men')).toBe(true);
    expect(gendersAreCompatible('women', 'men')).toBe(false);
  });
});
