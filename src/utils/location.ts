import axios from 'axios';
import { useTripStore } from '../store/useTripStore';

export const getUserCountry = async (): Promise<string> => {
  // 1. Try using the GPS coordinates saved in Zustand
  const state = useTripStore.getState();
  if (state.currentLocation) {
    try {
      const { lat, lon } = state.currentLocation;
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`, { timeout: 5000 });
      if (res.data?.address?.country) {
        return res.data.address.country;
      }
    } catch (err) {
      console.warn('[Location Utility] Reverse geocode failed:', err);
    }
  }

  // 2. Fallback to System Timezone mapping
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Asia/India')) return 'India';
      if (tz.includes('Tokyo') || tz.includes('Asia/Tokyo')) return 'Japan';
      if (tz.includes('London') || tz.includes('Europe/London') || tz.includes('GB')) return 'United Kingdom';
      if (tz.includes('America/')) return 'United States';
      if (tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Madrid') || tz.includes('Europe/')) return 'France'; // Europe
    }
  } catch {}

  return '';
};
