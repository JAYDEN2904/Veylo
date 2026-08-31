import { WeatherData, WeatherForecast } from '../types';
import { functionsClient } from './functionsClient';
import { isSupabaseConfigured } from './supabase';

const getWeatherIcon = (iconCode: string): string => {
  const iconMap: Record<string, string> = {
    '01d': 'sunny',
    '01n': 'moon',
    '02d': 'partly-sunny',
    '02n': 'cloudy-night',
    '03d': 'cloud',
    '03n': 'cloud',
    '04d': 'cloudy',
    '04n': 'cloudy',
    '09d': 'rainy',
    '09n': 'rainy',
    '10d': 'rainy',
    '10n': 'rainy',
    '11d': 'thunderstorm',
    '11n': 'thunderstorm',
    '13d': 'snow',
    '13n': 'snow',
    '50d': 'partly-sunny',
    '50n': 'cloudy-night',
  };
  return iconMap[iconCode] || 'partly-sunny';
};

export const weatherService = {
  /** Current weather via server-side proxy (cached 10m). Returns null if live fetch fails. */
  getCurrentWeather: async (latitude: number, longitude: number): Promise<WeatherData | null> => {
    if (!isSupabaseConfigured()) return null;

    try {
      const res = await functionsClient.weather({
        lat: latitude,
        lon: longitude,
        units: 'metric',
      });
      return {
        temperature: Math.round(res.weather.temperature),
        condition: res.weather.condition,
        description: res.weather.description,
        humidity: res.weather.humidity,
        windSpeed: Math.round(res.weather.windSpeed),
        icon: getWeatherIcon(res.weather.icon),
        feelsLike: Math.round(res.weather.feelsLike),
        location: res.weather.location,
      };
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[weather] edge fn failed', err);
      return null;
    }
  },

  /** 7-day forecast via server-side proxy. Returns [] if live fetch fails. */
  getForecast: async (latitude: number, longitude: number): Promise<WeatherForecast[]> => {
    if (!isSupabaseConfigured()) return [];

    try {
      const res = await functionsClient.weather({
        lat: latitude,
        lon: longitude,
        units: 'metric',
      });
      return res.forecast.map((day) => ({
        date: day.date,
        high: Math.round(day.high),
        low: Math.round(day.low),
        condition: day.condition,
        icon: getWeatherIcon(day.icon),
        chanceOfRain: Math.round((day.chanceOfRain ?? 0) * 100),
      }));
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__)
        console.warn('[weather] edge fn forecast failed', err);
      return [];
    }
  },

  /** Thresholds are Celsius (canonical for Accra / Ghana market). */
  getWeatherOutfitDescription: (weather: WeatherData): string => {
    const temp = weather.temperature;
    const condition = weather.condition.toLowerCase();

    if (temp >= 27) {
      if (condition.includes('rain'))
        return 'Hot and rainy - perfect for light layers and waterproof items';
      return 'Hot and sunny - perfect for light, breathable fabrics';
    } else if (temp >= 21) {
      if (condition.includes('rain')) return 'Warm with chance of rain - bring a light jacket';
      return 'Warm and pleasant - great for light layers';
    } else if (temp >= 16) {
      if (condition.includes('rain'))
        return 'Cool and rainy - perfect for a light jacket or sweater';
      return 'Cool and comfortable - ideal for layers';
    } else if (temp >= 10) {
      return 'Chilly - time for a jacket or sweater';
    } else if (temp >= 4) {
      return 'Cold - bundle up with a warm coat';
    } else {
      return 'Very cold - wear your warmest layers';
    }
  },
};
