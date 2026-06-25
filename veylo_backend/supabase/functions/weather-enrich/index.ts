// weather-enrich — OpenWeather proxy with a 10-minute cache.
//
// Input:
//   { lat: number, lon: number, units?: 'metric' | 'imperial' }
//   -- OR --
//   { city: string, units?: 'metric' | 'imperial' }
// Output:
//   { ok: true, cached: boolean, weather: WeatherData, forecast?: WeatherForecast[] }
//
// Why proxy: keeps OPENWEATHER_API_KEY off the client, and the cache keeps
// us under the free-tier QPS even if many users open the calendar at once.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { logUsage } from '../_shared/usage.ts';

interface Payload {
  lat?: number;
  lon?: number;
  city?: string;
  units?: 'metric' | 'imperial';
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

function owmKey(): string {
  const k = Deno.env.get('OPENWEATHER_API_KEY');
  if (!k) throw new Error('OPENWEATHER_API_KEY not configured');
  return k;
}

function cacheKey(p: Payload): string {
  const units = p.units ?? 'metric';
  if (typeof p.lat === 'number' && typeof p.lon === 'number') {
    return `coord:${p.lat.toFixed(2)}:${p.lon.toFixed(2)}:${units}`;
  }
  if (p.city) return `city:${p.city.toLowerCase()}:${units}`;
  return '';
}

async function fetchOwm(p: Payload): Promise<{
  weather: Record<string, unknown>;
  forecast: Record<string, unknown>;
}> {
  const units = p.units ?? 'metric';
  const params = new URLSearchParams({ appid: owmKey(), units });
  if (typeof p.lat === 'number' && typeof p.lon === 'number') {
    params.set('lat', String(p.lat));
    params.set('lon', String(p.lon));
  } else if (p.city) {
    params.set('q', p.city);
  } else {
    throw new Error('lat/lon or city required');
  }

  const [weatherRes, forecastRes] = await Promise.all([
    fetch(`${OWM_BASE}/weather?${params}`),
    fetch(`${OWM_BASE}/forecast?${params}`),
  ]);

  if (!weatherRes.ok) throw new Error(`OWM weather ${weatherRes.status}`);
  if (!forecastRes.ok) throw new Error(`OWM forecast ${forecastRes.status}`);

  return {
    weather: await weatherRes.json(),
    forecast: await forecastRes.json(),
  };
}

interface NormalizedWeather {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  feelsLike: number;
  location: string;
}

function normalize(raw: Record<string, unknown>): NormalizedWeather {
  const main = (raw.main ?? {}) as Record<string, number>;
  const wind = (raw.wind ?? {}) as Record<string, number>;
  const w = ((raw.weather as Record<string, string>[]) ?? [])[0] ?? {};
  return {
    temperature: Math.round(main.temp ?? 0),
    feelsLike: Math.round(main.feels_like ?? main.temp ?? 0),
    condition: w.main ?? 'Unknown',
    description: w.description ?? '',
    humidity: main.humidity ?? 0,
    windSpeed: wind.speed ?? 0,
    icon: w.icon ?? '01d',
    location: (raw.name as string) ?? '',
  };
}

interface ForecastEntry {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  chanceOfRain: number;
}

function normalizeForecast(raw: Record<string, unknown>): ForecastEntry[] {
  const list = (raw.list as Record<string, unknown>[]) ?? [];
  const byDay = new Map<string, ForecastEntry>();
  for (const entry of list) {
    const dt = ((entry.dt_txt as string) ?? '').slice(0, 10);
    if (!dt) continue;
    const main = (entry.main ?? {}) as Record<string, number>;
    const w = ((entry.weather as Record<string, string>[]) ?? [])[0] ?? {};
    const pop = (entry.pop as number) ?? 0;
    const existing = byDay.get(dt);
    if (existing) {
      existing.high = Math.max(existing.high, Math.round(main.temp_max ?? 0));
      existing.low = Math.min(existing.low, Math.round(main.temp_min ?? 0));
      existing.chanceOfRain = Math.max(existing.chanceOfRain, pop);
    } else {
      byDay.set(dt, {
        date: dt,
        high: Math.round(main.temp_max ?? 0),
        low: Math.round(main.temp_min ?? 0),
        condition: w.main ?? 'Unknown',
        icon: w.icon ?? '01d',
        chanceOfRain: pop,
      });
    }
  }
  return Array.from(byDay.values()).slice(0, 5);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user } = ctx;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const key = cacheKey(payload);
  if (!key) {
    return jsonResponse({ error: 'lat/lon or city required' }, { status: 400 });
  }

  const service = getServiceClient();

  const { data: cached } = await service
    .from('weather_cache')
    .select('payload, expires_at')
    .eq('cache_key', key)
    .maybeSingle();

  if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
    return jsonResponse({ ok: true, cached: true, ...cached.payload });
  }

  let raw;
  try {
    raw = await fetchOwm(payload);
  } catch (err) {
    console.error('[weather-enrich] OWM failed', err);
    return jsonResponse(
      { error: 'OpenWeather request failed', detail: String(err) },
      { status: 502 }
    );
  }

  const responseBody = {
    weather: normalize(raw.weather),
    forecast: normalizeForecast(raw.forecast),
  };

  await service.from('weather_cache').upsert({
    cache_key: key,
    payload: responseBody,
    expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  });

  await logUsage(service, {
    user_id: user.id,
    function_name: 'weather-enrich',
    provider: 'openweather',
    units: 2,
    metadata: { key },
  });

  return jsonResponse({ ok: true, cached: false, ...responseBody });
});
