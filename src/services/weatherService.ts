import { WeatherData, WeatherForecast } from '../types';
import { functionsClient } from './functionsClient';
import { isSupabaseConfigured } from './supabase';

// Direct OpenWeather fallback (only used when the Edge Function isn't reachable).
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

interface OpenWeatherResponse {
  weather: Array<{ main: string; description: string; icon: string }>;
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  name: string;
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number;
    main: { temp_max: number; temp_min: number };
    weather: Array<{ main: string; icon: string }>;
    pop?: number;
  }>;
}

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

const kelvinToFahrenheit = (kelvin: number): number => Math.round(((kelvin - 273.15) * 9) / 5 + 32);

export const weatherService = {
  /** Current weather via server-side proxy (cached 10m). Falls back to direct API or mock. */
  getCurrentWeather: async (latitude: number, longitude: number): Promise<WeatherData | null> => {
    if (isSupabaseConfigured()) {
      try {
        const res = await functionsClient.weather({
          lat: latitude,
          lon: longitude,
          units: 'imperial',
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
        if (__DEV__) console.warn('[weather] edge fn failed, falling back', err);
      }
    }

    try {
      if (!OPENWEATHER_API_KEY) return getMockWeatherData();

      const response = await fetch(
        `${OPENWEATHER_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`
      );

      if (!response.ok) return getMockWeatherData();

      const data: OpenWeatherResponse = await response.json();
      return {
        temperature: kelvinToFahrenheit(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 2.237),
        icon: getWeatherIcon(data.weather[0].icon),
        feelsLike: kelvinToFahrenheit(data.main.feels_like),
        location: data.name,
      };
    } catch (error) {
      if (__DEV__) console.error('Error fetching weather:', error);
      return getMockWeatherData();
    }
  },

  /** 7-day forecast via server-side proxy. */
  getForecast: async (latitude: number, longitude: number): Promise<WeatherForecast[]> => {
    if (isSupabaseConfigured()) {
      try {
        const res = await functionsClient.weather({
          lat: latitude,
          lon: longitude,
          units: 'imperial',
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
        if (__DEV__) console.warn('[weather] edge fn forecast failed, falling back', err);
      }
    }

    try {
      if (!OPENWEATHER_API_KEY) return getMockForecast();

      const response = await fetch(
        `${OPENWEATHER_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`
      );
      if (!response.ok) return getMockForecast();

      const data: OpenWeatherForecastResponse = await response.json();
      const dailyForecasts: Record<string, WeatherForecast> = {};
      data.list.forEach((item) => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyForecasts[date]) {
          dailyForecasts[date] = {
            date: new Date(item.dt * 1000).toISOString(),
            high: kelvinToFahrenheit(item.main.temp_max),
            low: kelvinToFahrenheit(item.main.temp_min),
            condition: item.weather[0].main,
            icon: getWeatherIcon(item.weather[0].icon),
            chanceOfRain: item.pop ? Math.round(item.pop * 100) : undefined,
          };
        } else {
          const current = dailyForecasts[date];
          const high = kelvinToFahrenheit(item.main.temp_max);
          const low = kelvinToFahrenheit(item.main.temp_min);
          if (high > current.high) current.high = high;
          if (low < current.low) current.low = low;
        }
      });
      return Object.values(dailyForecasts).slice(0, 7);
    } catch (error) {
      if (__DEV__) console.error('Error fetching forecast:', error);
      return getMockForecast();
    }
  },

  getWeatherOutfitDescription: (weather: WeatherData): string => {
    const temp = weather.temperature;
    const condition = weather.condition.toLowerCase();

    if (temp >= 80) {
      if (condition.includes('rain'))
        return 'Hot and rainy - perfect for light layers and waterproof items';
      return 'Hot and sunny - perfect for light, breathable fabrics';
    } else if (temp >= 70) {
      if (condition.includes('rain')) return 'Warm with chance of rain - bring a light jacket';
      return 'Warm and pleasant - great for light layers';
    } else if (temp >= 60) {
      if (condition.includes('rain'))
        return 'Cool and rainy - perfect for a light jacket or sweater';
      return 'Cool and comfortable - ideal for layers';
    } else if (temp >= 50) {
      return 'Chilly - time for a jacket or sweater';
    } else if (temp >= 40) {
      return 'Cold - bundle up with a warm coat';
    } else {
      return 'Very cold - wear your warmest layers';
    }
  },
};

function getMockWeatherData(): WeatherData {
  // Mock data is displayed when no API key is configured or all weather sources fail.
  // Callers see "Accra, GH" so the demo makes geographic sense for the West African user base.
  console.warn(
    '[weatherService] Using mock weather data — configure EXPO_PUBLIC_OPENWEATHER_API_KEY for real weather.'
  );
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 20;
  // Accra baseline: warm and humid year-round (~86°F / 30°C)
  const temperature = 86 + Math.floor(Math.random() * 6) - 3;
  return {
    temperature,
    condition: 'Clear',
    description: 'clear sky',
    humidity: 75,
    windSpeed: 10,
    icon: isDaytime ? 'sunny' : 'moon',
    feelsLike: temperature + 2,
    location: 'Accra, GH',
  };
}

function getMockForecast(): WeatherForecast[] {
  const forecasts: WeatherForecast[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const baseTemp = 72;
    const variation = Math.floor(Math.random() * 15) - 7;
    forecasts.push({
      date: date.toISOString(),
      high: baseTemp + variation + 5,
      low: baseTemp + variation - 5,
      condition: i % 3 === 0 ? 'Clouds' : 'Clear',
      icon: i % 3 === 0 ? 'cloudy' : 'sunny',
      chanceOfRain: i === 2 || i === 5 ? 30 : undefined,
    });
  }
  return forecasts;
}
