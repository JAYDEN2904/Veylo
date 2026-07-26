/**
 * Google Cloud Vision API garment tagging.
 */

import { fetchImageAsBase64, toBase64 } from './vertex.ts';

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface VisionTagResult {
  category: string;
  sub_category: string | null;
  colors: string[];
  colors_hsl: HslColor[];
  brand_guess: string | null;
  material_guess: string | null;
  pattern: string | null;
  season: string[];
  style_tags: string[];
  confidence: number;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKEN_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const b64 = toBase64(bytes);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.replace(/\\n/g, '\n');
  const pemContents = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - now > 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }
  const clientEmail = requireEnv('GCP_SA_CLIENT_EMAIL');
  const privateKey = requireEnv('GCP_SA_PRIVATE_KEY');
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(now / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
    scope: TOKEN_SCOPE,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`GCP token ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  cachedToken = { accessToken: data.access_token, expiresAtMs: now + expiresIn * 1000 };
  return cachedToken.accessToken;
}

function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToName(hsl: HslColor): string {
  const { h, s, l } = hsl;
  if (s < 12) {
    if (l < 18) return 'black';
    if (l > 82) return 'white';
    return 'gray';
  }
  if (h < 20 || h >= 350) return l > 55 ? 'pink' : 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 150) return 'green';
  if (h < 190) return 'teal';
  if (h < 250) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

const CATEGORY_RULES: Array<{ category: string; tokens: string[] }> = [
  { category: 'dress', tokens: ['dress', 'gown', 'jumpsuit'] },
  { category: 'shoes', tokens: ['shoe', 'sneaker', 'boot', 'sandal', 'footwear'] },
  {
    category: 'outerwear',
    tokens: ['jacket', 'coat', 'blazer', 'cardigan', 'hoodie', 'outerwear'],
  },
  { category: 'bottom', tokens: ['pants', 'jeans', 'trouser', 'shorts', 'skirt', 'leggings'] },
  { category: 'top', tokens: ['shirt', 'blouse', 'top', 't-shirt', 'tee', 'sweater', 'tank'] },
  {
    category: 'accessory',
    tokens: ['bag', 'hat', 'belt', 'scarf', 'watch', 'accessory', 'sunglasses'],
  },
];

const MATERIAL_TOKENS = [
  'cotton',
  'linen',
  'silk',
  'wool',
  'denim',
  'leather',
  'polyester',
  'nylon',
  'cashmere',
  'suede',
];
const PATTERN_TOKENS = [
  'striped',
  'stripe',
  'plaid',
  'floral',
  'print',
  'polka',
  'checkered',
  'solid',
];
const STYLE_FROM_LABELS = [
  'casual',
  'formal',
  'sport',
  'athletic',
  'vintage',
  'minimal',
  'elegant',
  'streetwear',
];

function mapCategory(labels: string[]): {
  category: string;
  sub_category: string | null;
  confidence: number;
} {
  const blob = labels.join(' ').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    const hit = rule.tokens.find((t) => blob.includes(t));
    if (hit) {
      return { category: rule.category, sub_category: hit, confidence: 0.78 };
    }
  }
  return { category: 'other', sub_category: labels[0] ?? null, confidence: 0.45 };
}

function inferSeason(tags: string[]): string[] {
  const blob = tags.join(' ').toLowerCase();
  const seasons: string[] = [];
  if (blob.match(/wool|coat|winter|warm/)) seasons.push('winter');
  if (blob.match(/linen|short|summer|tank/)) seasons.push('summer');
  if (blob.match(/light|spring/)) seasons.push('spring');
  if (blob.match(/layer|fall|autumn/)) seasons.push('fall');
  if (seasons.length === 0) seasons.push('spring', 'summer', 'fall');
  return seasons;
}

export async function tagGarmentFromVision(imageUrl: string): Promise<VisionTagResult> {
  const token = await getAccessToken();
  const content = await fetchImageAsBase64(imageUrl);

  const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'IMAGE_PROPERTIES' },
            { type: 'OBJECT_LOCALIZATION', maxResults: 8 },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Cloud Vision ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const annotation = data?.responses?.[0];
  if (annotation?.error) {
    throw new Error(annotation.error.message ?? 'Vision API error');
  }

  const labelDescs: string[] = (annotation?.labelAnnotations ?? [])
    .map((l: { description?: string; score?: number }) => l.description ?? '')
    .filter(Boolean);

  const objectNames: string[] = (annotation?.localizedObjectAnnotations ?? [])
    .map((o: { name?: string }) => o.name ?? '')
    .filter(Boolean);

  const allLabels = [...new Set([...labelDescs, ...objectNames])];
  const mapped = mapCategory(allLabels);

  const dominant = annotation?.imagePropertiesAnnotation?.dominantColors?.colors ?? [];
  const colorsHsl: HslColor[] = [];
  const colorNames: string[] = [];

  for (const entry of dominant.slice(0, 3)) {
    const rgb = entry?.color;
    if (!rgb) continue;
    const hsl = rgbToHsl(rgb.red ?? 0, rgb.green ?? 0, rgb.blue ?? 0);
    colorsHsl.push(hsl);
    colorNames.push(hslToName(hsl));
  }

  if (colorsHsl.length === 0) {
    colorsHsl.push({ h: 0, s: 0, l: 50 });
    colorNames.push('gray');
  }

  const blob = allLabels.join(' ').toLowerCase();
  const material = MATERIAL_TOKENS.find((m) => blob.includes(m)) ?? null;
  const pattern = PATTERN_TOKENS.find((p) => blob.includes(p)) ?? 'solid';

  const style_tags = STYLE_FROM_LABELS.filter((s) => blob.includes(s));
  if (style_tags.length === 0) style_tags.push('casual');

  const topLabelScore = annotation?.labelAnnotations?.[0]?.score ?? mapped.confidence;

  return {
    category: mapped.category,
    sub_category: mapped.sub_category,
    colors: colorNames,
    colors_hsl: colorsHsl,
    brand_guess: null,
    material_guess: material,
    pattern,
    season: inferSeason(allLabels),
    style_tags: style_tags.slice(0, 6),
    confidence: typeof topLabelScore === 'number' ? topLabelScore : mapped.confidence,
  };
}
