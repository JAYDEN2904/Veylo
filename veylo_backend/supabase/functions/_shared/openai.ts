/**
 * Thin OpenAI REST helpers used by tag-item, generate-embedding and
 * generate-outfit-ideas. Keeps secrets out of individual functions.
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

export interface VisionTagResult {
  category: string;
  sub_category: string | null;
  colors: string[];
  brand_guess: string | null;
  material_guess: string | null;
  season: string[];
  style_tags: string[];
  confidence: number;
}

const TAG_SCHEMA = {
  name: 'GarmentTags',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      category: {
        type: 'string',
        enum: ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'underwear', 'other'],
      },
      sub_category: { type: ['string', 'null'] },
      colors: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      brand_guess: { type: ['string', 'null'] },
      material_guess: { type: ['string', 'null'] },
      season: {
        type: 'array',
        items: { type: 'string', enum: ['spring', 'summer', 'fall', 'winter'] },
      },
      style_tags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: [
      'category',
      'sub_category',
      'colors',
      'brand_guess',
      'material_guess',
      'season',
      'style_tags',
      'confidence',
    ],
  },
} as const;

const TAG_PROMPT = `You are a fashion expert tagging a garment photo for a smart-closet app.
Identify the single garment in the photo. Be conservative on brand guesses — return null if unsure.
Colors should be common color names (e.g. "navy", "cream", "olive"), max 3.
style_tags should describe vibe (e.g. "minimalist", "casual", "y2k", "sporty").
If the image is not a garment, return category "other" with confidence 0.`;

export async function tagGarment(imageUrl: string): Promise<VisionTagResult> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_schema', json_schema: TAG_SCHEMA },
      messages: [
        { role: 'system', content: TAG_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Tag this garment.' },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI vision ${res.status}: ${body}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenAI vision returned no content');
  }
  return JSON.parse(content) as VisionTagResult;
}
