/**
 * Thin OpenAI REST helpers used by tag-item, generate-embedding and related flows.
 * Keeps secrets out of individual functions.
 *
 * Note: GPT vision garment tagging (tagGarment) was removed — tag-item uses Cloud Vision.
 * Free-form image URL forwarding to OpenAI is intentionally not supported (SSRF).
 */

const OPENAI_BASE = 'https://api.openai.com/v1';

function key(): string {
  const k = Deno.env.get('OPENAI_API_KEY');
  if (!k) throw new Error('OPENAI_API_KEY is not configured');
  return k;
}

export async function createEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[]> {
  const res = await fetch(`${OPENAI_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings ${res.status}: ${body}`);
  }
  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('OpenAI returned no embedding');
  }
  return embedding;
}
