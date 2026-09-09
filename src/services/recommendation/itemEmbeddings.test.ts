import { parseEmbedding } from './itemEmbeddings';

describe('parseEmbedding', () => {
  it('accepts numeric arrays', () => {
    expect(parseEmbedding([0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
  });

  it('parses JSON strings from pgvector', () => {
    expect(parseEmbedding('[1,0,0]')).toEqual([1, 0, 0]);
  });

  it('rejects empty or invalid payloads', () => {
    expect(parseEmbedding([])).toBeNull();
    expect(parseEmbedding('not-json')).toBeNull();
    expect(parseEmbedding(null)).toBeNull();
    expect(parseEmbedding([1, Number.NaN])).toBeNull();
  });
});
