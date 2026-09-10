export function parseEmbedding(value: unknown): number[] | null {
  const isFiniteNumber = (entry: unknown): entry is number =>
    typeof entry === 'number' && Number.isFinite(entry);

  if (Array.isArray(value) && value.length > 0 && value.every(isFiniteNumber)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parseEmbedding(parsed);
    } catch {
      return null;
    }
  }
  return null;
}
