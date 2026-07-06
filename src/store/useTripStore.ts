import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import type { TripPlanResult, PackingListCategory } from '../services/gemini';
import type { PlaceInfo } from '../services/overpass';

export interface SavedTrip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  budgetType: string;
  groupType: string;
  interests: string[];
  specialRequirements?: string;
  plan: TripPlanResult;
  packingList: PackingListCategory[];
  createdAt: string;
}

interface TripState {
  savedTrips: SavedTrip[];
  favorites: PlaceInfo[];
  recentSearches: string[];
  currentLocation: { lat: number; lon: number } | null;
  scrapedDestinations: any[]; // Caches of scraped city guides
  transportRoutes: any[]; // Caches of transit route numbers (e.g. M2)
  cityToCityRoutes: any[]; // Caches of place-to-place transit options (e.g. Tokyo to Kyoto)
  weatherCache: Record<string, { data: any; timestamp: number }>; // key: "lat,lon" -> weather info
  addTrip: (trip: SavedTrip) => void;
  deleteTrip: (id: string) => void;
  updateTripPackingList: (tripId: string, packingList: PackingListCategory[]) => void;
  toggleFavorite: (place: PlaceInfo) => void;
  isFavorite: (placeId: string) => boolean;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setCurrentLocation: (lat: number, lon: number) => void;
  addScrapedDestination: (dest: any) => void;
  addTransportRoute: (route: any) => void;
  addCityToCityRoute: (route: any) => void;
  addWeatherCache: (lat: number, lon: number, data: any) => void;
  syncToPreferences: () => Promise<void>;
  loadFromPreferences: () => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  savedTrips: (() => {
    try {
      const data = localStorage.getItem('saved_trips');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  })(),
  favorites: (() => {
    try {
      const data = localStorage.getItem('favorite_places');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  })(),
  recentSearches: (() => {
    try {
      const data = localStorage.getItem('recent_searches');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  })(),
  currentLocation: (() => {
    try {
      const data = localStorage.getItem('current_location');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })(),
  scrapedDestinations: (() => {
    try {
      const data = localStorage.getItem('scraped_destinations');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  })(),
  transportRoutes: (() => {
    try {
      const data = localStorage.getItem('transport_routes');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  })(),
  cityToCityRoutes: (() => {
    try {
      const data = localStorage.getItem('city_to_city_routes');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  })(),
  weatherCache: (() => {
    try {
      const data = localStorage.getItem('weather_cache');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  })(),

  syncToPreferences: async () => {
    const state = get();
    try {
      await Preferences.set({ key: 'saved_trips', value: JSON.stringify(state.savedTrips) });
      await Preferences.set({ key: 'favorite_places', value: JSON.stringify(state.favorites) });
      await Preferences.set({ key: 'recent_searches', value: JSON.stringify(state.recentSearches) });
      await Preferences.set({ key: 'scraped_destinations', value: JSON.stringify(state.scrapedDestinations) });
      await Preferences.set({ key: 'transport_routes', value: JSON.stringify(state.transportRoutes) });
      await Preferences.set({ key: 'city_to_city_routes', value: JSON.stringify(state.cityToCityRoutes) });
      await Preferences.set({ key: 'weather_cache', value: JSON.stringify(state.weatherCache) });
    } catch (err) {
      console.warn('[Zustand] Preferences sync failed:', err);
    }
  },

  loadFromPreferences: async () => {
    try {
      const savedTrips = await Preferences.get({ key: 'saved_trips' });
      const favorites = await Preferences.get({ key: 'favorite_places' });
      const recentSearches = await Preferences.get({ key: 'recent_searches' });
      const scrapedDestinations = await Preferences.get({ key: 'scraped_destinations' });
      const transportRoutes = await Preferences.get({ key: 'transport_routes' });
      const cityToCityRoutes = await Preferences.get({ key: 'city_to_city_routes' });
      const weatherCache = await Preferences.get({ key: 'weather_cache' });

      set({
        savedTrips: savedTrips.value ? JSON.parse(savedTrips.value) : get().savedTrips,
        favorites: favorites.value ? JSON.parse(favorites.value) : get().favorites,
        recentSearches: recentSearches.value ? JSON.parse(recentSearches.value) : get().recentSearches,
        scrapedDestinations: scrapedDestinations.value ? JSON.parse(scrapedDestinations.value) : get().scrapedDestinations,
        transportRoutes: transportRoutes.value ? JSON.parse(transportRoutes.value) : get().transportRoutes,
        cityToCityRoutes: cityToCityRoutes.value ? JSON.parse(cityToCityRoutes.value) : get().cityToCityRoutes,
        weatherCache: weatherCache.value ? JSON.parse(weatherCache.value) : get().weatherCache,
      });
    } catch (err) {
      console.warn('[Zustand] Preferences load failed, using local storage defaults:', err);
    }
  },

  addTrip: (trip) => set((state) => {
    const updated = [trip, ...state.savedTrips];
    localStorage.setItem('saved_trips', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { savedTrips: updated };
  }),

  deleteTrip: (id) => set((state) => {
    const updated = state.savedTrips.filter((t) => t.id !== id);
    localStorage.setItem('saved_trips', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { savedTrips: updated };
  }),

  updateTripPackingList: (tripId, packingList) => set((state) => {
    const updated = state.savedTrips.map((t) => 
      t.id === tripId ? { ...t, packingList } : t
    );
    localStorage.setItem('saved_trips', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { savedTrips: updated };
  }),

  toggleFavorite: (place) => set((state) => {
    const isFav = state.favorites.some((f) => f.id === place.id);
    let updated;
    if (isFav) {
      updated = state.favorites.filter((f) => f.id !== place.id);
    } else {
      updated = [place, ...state.favorites];
    }
    localStorage.setItem('favorite_places', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { favorites: updated };
  }),

  isFavorite: (placeId) => {
    return get().favorites.some((f) => f.id === placeId);
  },

  addRecentSearch: (query) => set((state) => {
    const clean = query.trim();
    if (!clean) return {};
    const filtered = state.recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, 10); // Keep last 10 searches
    localStorage.setItem('recent_searches', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { recentSearches: updated };
  }),

  clearRecentSearches: () => set(() => {
    localStorage.removeItem('recent_searches');
    setTimeout(() => get().syncToPreferences(), 100);
    return { recentSearches: [] };
  }),

  setCurrentLocation: (lat, lon) => set(() => {
    const loc = { lat, lon };
    localStorage.setItem('current_location', JSON.stringify(loc));
    return { currentLocation: loc };
  }),

  addScrapedDestination: (dest) => set((state) => {
    const filtered = state.scrapedDestinations.filter((d) => d.id !== dest.id);
    const updated = [dest, ...filtered];
    localStorage.setItem('scraped_destinations', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { scrapedDestinations: updated };
  }),

  addTransportRoute: (route) => set((state) => {
    const key = route.serviceNumber.toLowerCase();
    const filtered = state.transportRoutes.filter((r) => r.serviceNumber.toLowerCase() !== key);
    const updated = [route, ...filtered];
    localStorage.setItem('transport_routes', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { transportRoutes: updated };
  }),

  addCityToCityRoute: (route) => set((state) => {
    const key = `${route.from.toLowerCase()}_to_${route.to.toLowerCase()}`;
    const filtered = state.cityToCityRoutes.filter((r) => `${r.from.toLowerCase()}_to_${r.to.toLowerCase()}` !== key);
    const updated = [route, ...filtered];
    localStorage.setItem('city_to_city_routes', JSON.stringify(updated));
    setTimeout(() => get().syncToPreferences(), 100);
    return { cityToCityRoutes: updated };
  }),

  addWeatherCache: (lat, lon, data) => set((state) => {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cacheCopy = { ...state.weatherCache };
    cacheCopy[key] = { data, timestamp: Date.now() };
    localStorage.setItem('weather_cache', JSON.stringify(cacheCopy));
    setTimeout(() => get().syncToPreferences(), 100);
    return { weatherCache: cacheCopy };
  })
}));
