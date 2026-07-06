import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Compass, Clock, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useTripStore } from '../store/useTripStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { geocodeDestination, PRELOADED_DESTINATIONS } from '../services/overpass';
import { useNetworkStatus } from '../services/capacitor';
import axios from 'axios';
import { getUserCountry } from '../utils/location';
import { getCurrencySymbol } from '../utils/currency';
import { ScrapingAnimationScreen } from '../components/common/ScrapingAnimationScreen';
import { getBackendApiUrl, getBackendBaseUrl } from '../services/apiConfig';

export const SearchScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  
  // Scraper loading state
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperStatus, setScraperStatus] = useState('');

  const { recentSearches, addRecentSearch, clearRecentSearches, scrapedDestinations, addScrapedDestination } = useTripStore();
  const { loading: gpsLoading, refresh: getGPSLocation } = useGeolocation();
  const isOnline = useNetworkStatus();

  if (scraperStatus && false) {
    console.log(scraperStatus);
  }

  // Handle Search Submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchError(null);
    addRecentSearch(searchQuery);

    try {
      if (!isOnline) {
        // Offline Search Flow
        const queryLower = searchQuery.toLowerCase();
        const localMatches = [
          ...PRELOADED_DESTINATIONS,
          ...scrapedDestinations
        ].filter(
          d => d.name.toLowerCase().includes(queryLower) || 
               d.country.toLowerCase().includes(queryLower)
        );

        // Deduplicate
        const uniqueMatches = Array.from(new Map(localMatches.map(m => [m.id, m])).values());
        const finalResults = uniqueMatches.map((item) => ({
          id: item.id,
          name: item.name,
          country: item.country,
          lat: item.lat ?? (item as any).latitude,
          lon: item.lon ?? (item as any).longitude,
          isPreloaded: PRELOADED_DESTINATIONS.some((p) => p.id === item.id),
          isCached: scrapedDestinations.some((s) => s.id === item.id)
        }));

        setSearchResults(finalResults);
        if (finalResults.length === 0) {
          setSearchError('You are offline. Search only matches cached or downloaded destinations (Paris, Tokyo, Rome, etc.).');
        }
        return;
      }

      // 1. Fetch matching coordinates using geocoder
      const results = await geocodeDestination(searchQuery);
      
      // 2. Cross-reference with our preloaded and scraped guides
      const finalResults = results.map((item) => {
        // Check if preloaded
        const isPreloaded = PRELOADED_DESTINATIONS.some(
          (p) => p.name.toLowerCase() === item.name?.toLowerCase()
        );
        // Check if already scraped
        const isCached = scrapedDestinations.some(
          (s) => s.name.toLowerCase() === item.name?.toLowerCase()
        );
        return {
          ...item,
          isPreloaded,
          isCached
        };
      });

      setSearchResults(finalResults);
      if (finalResults.length === 0) {
        setSearchError('No matching destinations found. Try searching for Paris, Tokyo, or Rome.');
      }
    } catch (err) {
      setSearchError('Search failed. Check your internet connection.');
    }
  };

  // Perform Scrape & Gemini Structuring via Backend Server
  const handleScrapeDestination = async (queryName: string, _lat?: number, _lon?: number, _country?: string) => {
    if (!isOnline) {
      setSearchError('You are currently offline. Please connect to the internet to scrape and build new travel guides.');
      return;
    }

    setScraperLoading(true);
    setScraperStatus('Spinning up Playwright browser...');

    // cycle status messages for nice UI
    const statuses = [
      'Crawling official city portals and travel blogs...',
      'Extracting rules, emergency numbers, and transit stops...',
      'Prompting Gemini AI to structure data into JSON database format...',
      'Finalizing local cache records...'
    ];
    
    statuses.forEach((statusText, idx) => {
      setTimeout(() => {
        setScraperStatus(statusText);
      }, (idx + 1) * 3500);
    });

    try {
      const uCountry = await getUserCountry();
      // Direct request to our backend scraper server
      const response = await axios.get(`${getBackendApiUrl()}/scrape?query=${encodeURIComponent(queryName)}&userCountry=${encodeURIComponent(uCountry)}`, {
        timeout: 60000 // Scraper + Gemini structuring can take up to 60s
      });
      
      const structuredGuide = response.data;
      
      // Store in Zustand/local storage
      addScrapedDestination(structuredGuide);
      
      // Navigate to Discovery Page
      setScraperLoading(false);
      navigate(`/discovery/${structuredGuide.id}?lat=${structuredGuide.latitude}&lon=${structuredGuide.longitude}&name=${encodeURIComponent(structuredGuide.name)}&country=${encodeURIComponent(structuredGuide.country)}`);
    } catch (error: any) {
      console.error('Scraping backend failed:', error);
      setScraperLoading(false);
      setSearchError(error.response?.data?.details || error.message || 'Scraping failed. Make sure the backend server is running and configured.');
    }
  };

  // Handle GPS location search click
  const handleGPSClick = async () => {
    try {
      setScraperLoading(true);
      setScraperStatus('Fetching current GPS coordinates...');
      await getGPSLocation();
      
      const storeState = useTripStore.getState();
      const currentLoc = storeState.currentLocation || { lat: 48.8566, lon: 2.3522 };
      const lat = currentLoc.lat;
      const lon = currentLoc.lon;

      if (!isOnline) {
        setScraperStatus('Offline mode: searching closest cached destination...');
        const allCities = [...PRELOADED_DESTINATIONS, ...scrapedDestinations];
        
        let closestCity = allCities[0];
        let minDistance = Infinity;

        allCities.forEach(city => {
          const cLat = city.lat ?? (city as any).latitude;
          const cLon = city.lon ?? (city as any).longitude;
          const dist = Math.sqrt(Math.pow(cLat - lat, 2) + Math.pow(cLon - lon, 2));
          if (dist < minDistance) {
            minDistance = dist;
            closestCity = city;
          }
        });

        setScraperLoading(false);
        navigate(`/discovery/${closestCity.id}?lat=${closestCity.lat ?? (closestCity as any).latitude}&lon=${closestCity.lon ?? (closestCity as any).longitude}&name=${encodeURIComponent(closestCity.name)}&country=${encodeURIComponent(closestCity.country)}`);
        return;
      }

      setScraperStatus('Reverse-geocoding your location...');
      const revGeoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
      const response = await axios.get(revGeoUrl);
      
      const address = response.data?.address;
      const cityName = address?.city || address?.town || address?.village || address?.county || 'Current Location';
      const countryName = address?.country || '';

      setScraperStatus(`Identified: ${cityName}, ${countryName}. Checking cache...`);
      const destId = cityName.toLowerCase().replace(/\s+/g, '-');
      
      // Check if already cached
      const isCached = scrapedDestinations.some((s) => s.id === destId);
      const isPreloaded = PRELOADED_DESTINATIONS.some((p) => p.id === destId);
      
      if (isPreloaded || isCached) {
        setScraperLoading(false);
        navigate(`/discovery/${destId}?lat=${lat}&lon=${lon}&name=${encodeURIComponent(cityName)}&country=${encodeURIComponent(countryName)}`);
      } else {
        await handleScrapeDestination(cityName, lat, lon, countryName);
      }
    } catch (err: any) {
      console.error('GPS flow failed:', err);
      setScraperLoading(false);
      setSearchError('Failed to geocode current GPS location or scrape details.');
    }
  };

  const selectDestination = (dest: any) => {
    const destId = dest.id || dest.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/discovery/${destId}?lat=${dest.lat}&lon=${dest.lon}&name=${encodeURIComponent(dest.name)}&country=${encodeURIComponent(dest.country || '')}`);
  };



  // Static list of popular countries
  const popularCountries = [
    { name: 'France', code: 'FR', flag: '🇫🇷', lat: 46.2276, lon: 2.2137 },
    { name: 'Japan', code: 'JP', flag: '🇯🇵', lat: 36.2048, lon: 138.2529 },
    { name: 'Italy', code: 'IT', flag: '🇮🇹', lat: 41.8719, lon: 12.5674 },
    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', lat: 55.3781, lon: -3.4360 },
    { name: 'United States', code: 'US', flag: '🇺🇸', lat: 37.0902, lon: -95.7129 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-24 transition-colors duration-300">
      
      {/* Scraper Loading Screen */}
      <ScrapingAnimationScreen query={searchQuery} isActive={scraperLoading} />

      {/* Top Header */}
      <div className="px-6 pt-6 pb-2 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 font-sans font-extrabold tracking-widest text-xs text-green-600 dark:text-green-400 hover:opacity-85 cursor-pointer transition-opacity"
          >
            <Compass className="w-4 h-4 text-green-500 animate-spin-slow" />
            <span>TRAVEL GUIDE</span>
          </div>
          <ThemeToggle />
        </div>
        <div>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Welcome explorer</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h1 className="text-2xl font-extrabold tracking-tight">Where to next?</h1>
            {!isOnline && (
              <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold uppercase">Offline</span>
            )}
          </div>
        </div>
      </div>



      <div className="px-6 max-w-md mx-auto flex flex-col gap-6">
        
        {/* Search & Location Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search country, city, landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleGPSClick}
            disabled={gpsLoading}
            className="p-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-2xl flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Search near current GPS location"
          >
            <MapPin className={`w-5 h-5 ${gpsLoading ? 'animate-bounce' : ''}`} />
          </button>
        </form>

        {/* Dynamic Search Results */}
        {searchResults.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Results</h2>
            <div className="flex flex-col gap-1.5">
              {searchResults.map((dest, idx) => (
                <GlassCard
                  key={idx}
                  onClick={() => {
                    if (dest.isPreloaded || dest.isCached) {
                      selectDestination(dest);
                    } else {
                      handleScrapeDestination(dest.name, dest.lat, dest.lon, dest.country);
                    }
                  }}
                  className="flex items-center justify-between py-3 px-4 border border-slate-200/50 dark:border-slate-800/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{dest.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{dest.country || 'Destination'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dest.isPreloaded || dest.isCached ? (
                      <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-bold uppercase">Cached</span>
                    ) : (
                      <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                        <Sparkles size={8} /> Scrape
                      </span>
                    )}
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {searchError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex flex-col gap-1.5 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span className="font-semibold">{searchError}</span>
            </div>
            {(searchError.toLowerCase().includes('network error') || searchError.toLowerCase().includes('failed') || searchError.toLowerCase().includes('timeout')) && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal border-t border-red-500/10 pt-1.5 mt-0.5">
                💡 <strong>Mobile Setup Tip:</strong> Ensure your phone is connected to the same Wi-Fi network as your PC. You can configure your PC's IP address (active: <code className="bg-black/10 dark:bg-black/30 px-1 py-0.5 rounded font-mono">{getBackendBaseUrl()}</code>) inside the Settings button on the Welcome Screen.
              </p>
            )}
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && !searchResults.length && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Searches</h2>
              <button 
                onClick={clearRecentSearches}
                className="text-[10px] text-slate-400 hover:text-red-500 font-semibold cursor-pointer"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(search);
                    geocodeDestination(search).then(setSearchResults);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-xs cursor-pointer shadow-sm text-slate-600 dark:text-slate-300"
                >
                  <Clock size={12} className="text-slate-400" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Destinations Slider */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Popular Destinations</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {PRELOADED_DESTINATIONS.map((dest) => (
              <div 
                key={dest.id}
                onClick={() => selectDestination(dest)}
                className="relative min-w-[200px] h-[140px] rounded-2xl overflow-hidden snap-start cursor-pointer group shadow-sm hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                <img 
                  src={dest.imageUrl} 
                  alt={dest.name}
                  className="absolute inset-0 w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5">
                  <span className="text-[9px] bg-green-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ★ {dest.rating}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5">{dest.name}</h3>
                  <p className="text-[10px] text-slate-300">{dest.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Countries Grid */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Explore Countries</h2>
          <div className="grid grid-cols-2 gap-2">
            {popularCountries.map((c) => (
              <GlassCard
                key={c.code}
                onClick={() => {
                  setSearchQuery(c.name);
                  geocodeDestination(c.name).then(setSearchResults);
                }}
                className="flex items-center gap-2.5 py-2.5 px-3.5"
              >
                <span className="text-xl">{c.flag}</span>
                <span className="text-xs font-bold truncate">{c.name}</span>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Cities Grid */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Cities</h2>
          <div className="flex flex-col gap-2">
            {PRELOADED_DESTINATIONS.slice(0, 3).map((city) => (
              <GlassCard
                key={city.id}
                onClick={() => selectDestination(city)}
                className="flex items-center gap-3.5 py-2.5 px-3.5"
              >
                <img
                  src={city.imageUrl}
                  alt={city.name}
                  className="w-10 h-10 object-cover rounded-xl"
                  loading="lazy"
                />
                <div className="flex-1">
                  <h4 className="text-xs font-bold">{city.name}</h4>
                  <p className="text-[10px] text-slate-400">{city.country}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Est. Daily</span>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">{getCurrencySymbol(city.country)}{city.averageDailyCost}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
