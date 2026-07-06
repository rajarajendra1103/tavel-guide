import axios from 'axios';
import { getBackendApiUrl } from './apiConfig';

export interface WeatherData {
  temp: number;
  windSpeed: number;
  humidity: number;
  description: string;
  icon: string;
  forecast: {
    date: string;
    tempMax: number;
    tempMin: number;
    description: string;
    icon: string;
  }[];
}

// Maps WMO Weather Interpretation Codes to readable summaries & emojis
// https://open-meteo.com/en/docs
const mapWeatherCode = (code: number): { desc: string; icon: string } => {
  if (code === 0) return { desc: 'Clear sky', icon: '☀️' };
  if (code >= 1 && code <= 3) return { desc: 'Mainly clear / Partly cloudy', icon: '⛅' };
  if (code === 45 || code === 48) return { desc: 'Foggy', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { desc: 'Drizzle', icon: '🌧️' };
  if (code >= 61 && code <= 67) return { desc: 'Rainy', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { desc: 'Snowy', icon: '❄️' };
  if (code >= 80 && code <= 82) return { desc: 'Rain showers', icon: '🌦️' };
  if (code >= 85 && code <= 86) return { desc: 'Snow showers', icon: '🌨️' };
  if (code >= 95 && code <= 99) return { desc: 'Thunderstorm', icon: '⛈️' };
  return { desc: 'Overcast', icon: '☁️' };
};

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    let data;
    try {
      const proxyUrl = `${getBackendApiUrl()}/weather?lat=${lat}&lon=${lon}`;
      const response = await axios.get(proxyUrl, { timeout: 5000 });
      data = response.data;
    } catch (proxyErr) {
      console.warn('Weather proxy failed, fetching direct from Open-Meteo API:', proxyErr);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const response = await axios.get(url);
      data = response.data;
    }

    const current = data.current;
    const daily = data.daily;

    const currentCondition = mapWeatherCode(current.weather_code);

    const forecast = daily.time.map((time: string, idx: number) => {
      const condition = mapWeatherCode(daily.weather_code[idx]);
      const dateObj = new Date(time);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      return {
        date: dayName,
        tempMax: Math.round(daily.temperature_2m_max[idx]),
        tempMin: Math.round(daily.temperature_2m_min[idx]),
        description: condition.desc,
        icon: condition.icon,
      };
    });

    return {
      temp: Math.round(current.temperature_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      humidity: current.relative_humidity_2m,
      description: currentCondition.desc,
      icon: currentCondition.icon,
      forecast: forecast.slice(0, 5), // Return 5 days forecast
    };
  } catch (error) {
    console.error('Error fetching weather data from Open-Meteo:', error);
    // Return high quality mock fallback in case of rate limits or offline mode
    return {
      temp: 22,
      windSpeed: 12,
      humidity: 65,
      description: 'Partly Cloudy (Offline Fallback)',
      icon: '⛅',
      forecast: [
        { date: 'Today', tempMax: 24, tempMin: 16, description: 'Partly Cloudy', icon: '⛅' },
        { date: 'Tomorrow', tempMax: 26, tempMin: 18, description: 'Sunny', icon: '☀️' },
        { date: 'Day 3', tempMax: 23, tempMin: 15, description: 'Light Showers', icon: '🌦️' },
        { date: 'Day 4', tempMax: 21, tempMin: 14, description: 'Cloudy', icon: '☁️' },
        { date: 'Day 5', tempMax: 25, tempMin: 17, description: 'Mostly Clear', icon: '☀️' },
      ],
    };
  }
};
