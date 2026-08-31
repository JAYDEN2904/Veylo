import { weatherService } from './weatherService';
import { isSupabaseConfigured } from './supabase';
import { functionsClient } from './functionsClient';

jest.mock('./supabase', () => ({
  isSupabaseConfigured: jest.fn(),
}));

jest.mock('./functionsClient', () => ({
  functionsClient: {
    weather: jest.fn(),
  },
}));

const mockIsConfigured = isSupabaseConfigured as jest.MockedFunction<typeof isSupabaseConfigured>;
const mockWeather = functionsClient.weather as jest.MockedFunction<typeof functionsClient.weather>;

describe('weatherService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when Supabase is not configured (no client OpenWeather key)', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(weatherService.getCurrentWeather(1, 2)).resolves.toBeNull();
    expect(mockWeather).not.toHaveBeenCalled();
  });

  it('maps edge weather payload', async () => {
    mockIsConfigured.mockReturnValue(true);
    mockWeather.mockResolvedValue({
      ok: true,
      cached: false,
      weather: {
        temperature: 72.4,
        condition: 'Clear',
        description: 'clear sky',
        humidity: 40,
        windSpeed: 5.2,
        icon: '01d',
        feelsLike: 71.1,
        location: 'Austin',
      },
      forecast: [],
    });

    const result = await weatherService.getCurrentWeather(30, -97);
    expect(mockWeather).toHaveBeenCalledWith({
      lat: 30,
      lon: -97,
      units: 'metric',
    });
    expect(result).toEqual({
      temperature: 72,
      condition: 'Clear',
      description: 'clear sky',
      humidity: 40,
      windSpeed: 5,
      icon: 'sunny',
      feelsLike: 71,
      location: 'Austin',
    });
  });

  it('returns null when edge weather fails (no direct API fallback)', async () => {
    mockIsConfigured.mockReturnValue(true);
    mockWeather.mockRejectedValue(new Error('network'));
    await expect(weatherService.getCurrentWeather(1, 2)).resolves.toBeNull();
  });

  it('returns empty forecast when not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(weatherService.getForecast(1, 2)).resolves.toEqual([]);
  });
});
