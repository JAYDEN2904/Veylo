/**
 * Vertex AI REST helpers — service-account JWT auth + :predict calls.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKEN_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

export interface VertexPrediction {
  bytesBase64Encoded?: string;
  mimeType?: string;
  [key: string]: unknown;
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function vertexProjectId(): string {
  return requireEnv('GCP_PROJECT_ID');
}

export function vertexLocation(): string {
  return Deno.env.get('GCP_LOCATION') ?? 'us-central1';
}

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const b64 = btoa(String.fromCharCode(...bytes));
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

async function signJwt(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
    scope: TOKEN_SCOPE,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function fetchAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - now > 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }

  const clientEmail = requireEnv('GCP_SA_CLIENT_EMAIL');
  const privateKey = requireEnv('GCP_SA_PRIVATE_KEY');
  const assertion = await signJwt(clientEmail, privateKey);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Vertex token exchange ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  if (!data?.access_token) {
    throw new Error('Vertex token exchange returned no access_token');
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  cachedToken = {
    accessToken: data.access_token as string,
    expiresAtMs: now + expiresIn * 1000,
  };
  return cachedToken.accessToken;
}

export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Download image bytes from a signed URL and return base64. */
export async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not download image: ${res.status}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  return toBase64(bytes);
}

function predictUrl(model: string): string {
  const project = vertexProjectId();
  const location = vertexLocation();
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;
}

/**
 * Call a Vertex AI publisher model predict endpoint.
 */
export async function vertexPredict(
  model: string,
  instances: Record<string, unknown>[],
  parameters: Record<string, unknown> = {}
): Promise<VertexPrediction[]> {
  const token = await fetchAccessToken();
  const res = await fetch(predictUrl(model), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ instances, parameters }),
  });

  if (!res.ok) {
    throw new Error(`Vertex predict ${model} ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const predictions = data?.predictions;
  if (!Array.isArray(predictions) || predictions.length === 0) {
    throw new Error(`Vertex predict ${model} returned no predictions`);
  }
  return predictions as VertexPrediction[];
}

/** Extract the first image bytes from a predict response. */
export function firstPredictionBytes(predictions: VertexPrediction[]): {
  bytes: Uint8Array;
  mimeType: string;
} {
  const first = predictions[0];
  const encoded = first?.bytesBase64Encoded;
  if (typeof encoded !== 'string' || !encoded) {
    throw new Error('Vertex prediction missing bytesBase64Encoded');
  }
  const mimeType = typeof first.mimeType === 'string' ? first.mimeType : 'image/png';
  return { bytes: fromBase64(encoded), mimeType };
}
