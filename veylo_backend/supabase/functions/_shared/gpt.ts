/**
 * OpenAI chat completions with optional JSON schema response_format.
 */

const OPENAI_BASE = 'https://api.openai.com/v1';

function openAiKey(): string {
  const k = Deno.env.get('OPENAI_API_KEY');
  if (!k) throw new Error('OPENAI_API_KEY is not configured');
  return k;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletionJson<T>(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    jsonSchema?: { name: string; schema: Record<string, unknown>; strict?: boolean };
  } = {}
): Promise<T> {
  const model = options.model ?? 'gpt-4o-mini';
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.4,
  };

  if (options.jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: options.jsonSchema.name,
        schema: options.jsonSchema.schema,
        strict: options.jsonSchema.strict ?? true,
      },
    };
  }

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI chat ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenAI returned no message content');
  }
  return JSON.parse(content) as T;
}
