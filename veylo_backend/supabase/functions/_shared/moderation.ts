/**
 * Content moderation — text via OpenAI moderations; images via cheap vision JSON check.
 */

const OPENAI_BASE = 'https://api.openai.com/v1';

function openAiKey(): string {
  const k = Deno.env.get('OPENAI_API_KEY');
  if (!k) throw new Error('OPENAI_API_KEY is not configured');
  return k;
}

export interface ModerationOutcome {
  flagged: boolean;
  categories?: Record<string, boolean>;
}

export async function moderateText(text: string): Promise<ModerationOutcome> {
  const res = await fetch(`${OPENAI_BASE}/moderations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-moderation-latest',
      input: text.slice(0, 8000),
    }),
  });

  if (!res.ok) {
    throw new Error(`Moderation API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const result = data?.results?.[0];
  return {
    flagged: Boolean(result?.flagged),
    categories: result?.categories as Record<string, boolean> | undefined,
  };
}

export async function moderateImageUrl(imageUrl: string): Promise<ModerationOutcome> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ImageModeration',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              flagged: { type: 'boolean' },
              reason: { type: ['string', 'null'] },
            },
            required: ['flagged', 'reason'],
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'You flag harmful fashion/social photos: explicit nudity, graphic violence, hate symbols, or illegal content. Normal outfits and selfies are NOT flagged.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Reply with JSON only. Should this image be blocked from a public fashion feed?',
            },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Vision moderation ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return { flagged: false };
  }
  const parsed = JSON.parse(content) as { flagged: boolean };
  return { flagged: Boolean(parsed.flagged) };
}
