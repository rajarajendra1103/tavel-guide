import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldAlert, Compass, Search, 
  ChevronLeft, Sparkles, MapPin, DollarSign, Calendar, Clock,
  Hotel, Utensils, Heart, Volume2, Download, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { LeafletMap } from '../components/map/LeafletMap';
import { useGeolocation } from '../hooks/useGeolocation';
import { useTripStore } from '../store/useTripStore';
import { fetchWeather } from '../services/weather';
import type { WeatherData } from '../services/weather';
import axios from 'axios';
import { getUserCountry } from '../utils/location';
import { getCurrencySymbol } from '../utils/currency';
import { getPlaces, PRELOADED_DESTINATIONS } from '../services/overpass';
import type { DestinationInfo, PlaceInfo } from '../services/overpass';
import { useNetworkStatus } from '../services/capacitor';
import { downloadDestinationGuide, readDownloadedGuide, deleteDownloadedGuide, listDownloadedGuides } from '../services/offline';
import { ScrapingAnimationScreen } from '../components/common/ScrapingAnimationScreen';
import { getBackendApiUrl } from '../services/apiConfig';

export const DiscoveryScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Route parameters or search parameters fallbacks
  const latParam = parseFloat(searchParams.get('lat') || '48.8566');
  const lonParam = parseFloat(searchParams.get('lon') || '2.3522');
  const nameParam = searchParams.get('name') || 'Paris';
  const countryParam = searchParams.get('country') || 'France';

  const [destination, setDestination] = useState<DestinationInfo | null>(null);
  const [places, setPlaces] = useState<PlaceInfo[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<PlaceInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [placesSearchQuery, setPlacesSearchQuery] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'weather' | 'places' | 'rules'>('info');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isOnline = useNetworkStatus();
  const { location: currentGPS } = useGeolocation();
  const { toggleFavorite, isFavorite, scrapedDestinations, weatherCache, addWeatherCache } = useTripStore();

  useEffect(() => {
    const loadDestinationData = async () => {
      setLoading(true);
      try {
        if (!id) return;

        // 1. Check if the guide is downloaded in the local file system
        let dest = await readDownloadedGuide(id);
        
        // 2. Try to load destination from scraped cache or preloaded list
        if (!dest) {
          dest = scrapedDestinations.find(d => d.id === id) || 
                 PRELOADED_DESTINATIONS.find(d => d.id === id);
        }
        
        // 3. Scrape from backend if not found anywhere and online
        if (!dest) {
          if (!isOnline) {
            alert('This destination is not cached. Please connect to the internet to load.');
            setLoading(false);
            return;
          }

          console.log(`[DiscoveryScreen] City not in cache, triggering dynamic scrape for: ${nameParam}`);
          const uCountry = await getUserCountry();
          const response = await axios.get(`${getBackendApiUrl()}/scrape?query=${encodeURIComponent(nameParam)}&userCountry=${encodeURIComponent(uCountry)}`, {
            timeout: 60000
          });
          dest = response.data;
          
          if (dest) {
            useTripStore.getState().addScrapedDestination(dest);
          } else {
            throw new Error(`Failed to scrape destination data for: ${nameParam}`);
          }
        }

        setDestination(dest as any);

        // 4. Check if currently downloaded
        const downloads = await listDownloadedGuides();
        setIsDownloaded(downloads.includes(id));

        // 5. Fetch Weather (Check Cache first)
        const lat = dest.lat ?? (dest as any).latitude ?? latParam;
        const lon = dest.lon ?? (dest as any).longitude ?? lonParam;
        const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        const cachedWeather = weatherCache[cacheKey];

        // If cache exists and is fresh (less than 3 hours), use it
        if (cachedWeather && (Date.now() - cachedWeather.timestamp < 3 * 60 * 60 * 1000)) {
          setWeather(cachedWeather.data);
        } else if (isOnline) {
          const weatherData = await fetchWeather(lat, lon);
          setWeather(weatherData);
          addWeatherCache(lat, lon, weatherData);
        } else if (cachedWeather) {
          // If offline, use cache regardless of age
          setWeather(cachedWeather.data);
        } else {
          // Fallback weather
          const weatherData = await fetchWeather(lat, lon);
          setWeather(weatherData);
        }

        // 6. Fetch Places near coordinates
        let placesList: PlaceInfo[] = [];
        if ((dest as any).places && (dest as any).places.length > 0) {
          placesList = (dest as any).places.map((p: any) => ({
            id: p.id,
            destinationId: dest!.id,
            name: p.name,
            type: p.type,
            lat: p.lat ?? p.latitude ?? lat,
            lon: p.lon ?? p.longitude ?? lon,
            imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
            description: p.description || '',
            history: p.history,
            rating: p.rating || 4.5,
            timings: p.timings || '09:00 - 18:00',
            entryFee: p.entryFee || 0,
            avgVisitTime: p.avgVisitTime || 60,
            transportRules: p.transportRules || [],
            nearbyServices: p.nearbyServices || []
          }));
        } else {
          placesList = await getPlaces(lat, lon, dest.id);
        }
        
        setPlaces(placesList);
        setFilteredPlaces(placesList);
        
      } catch (err) {
        console.error('Error fetching discovery details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDestinationData();
  }, [id, latParam, lonParam, nameParam, countryParam, scrapedDestinations, isOnline, weatherCache]);

  const handleDownload = async () => {
    if (!destination) return;
    setDownloading(true);
    const success = await downloadDestinationGuide(destination);
    if (success) {
      setIsDownloaded(true);
    } else {
      alert('Failed to download guide to local storage.');
    }
    setDownloading(false);
  };

  const handleDeleteDownload = async () => {
    if (!destination) return;
    if (window.confirm(`Are you sure you want to delete the offline downloaded files for ${destination.name}?`)) {
      const success = await deleteDownloadedGuide(destination.id);
      if (success) {
        setIsDownloaded(false);
      }
    }
  };
  
  const currencySym = (destination as any)?.currencySymbol || getCurrencySymbol(destination?.country || countryParam);

  const categories = [
    { id: 'all', label: 'All', icon: Compass },
    { id: 'landmark', label: 'Sights', icon: MapPin },
    { id: 'hotel', label: 'Hotels', icon: Hotel },
    { id: 'restaurant', label: 'Eats', icon: Utensils },
    { id: 'park', label: 'Parks', icon: Compass },
    { id: 'museum', label: 'Museums', icon: Compass },
    { id: 'shopping', label: 'Shopping', icon: Compass },
    { id: 'beach', label: 'Beaches', icon: Compass },
  ];

  // Handle category filtering
  useEffect(() => {
    let list = places;
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.type === selectedCategory);
    }
    if (placesSearchQuery.trim()) {
      list = list.filter(p => p.name.toLowerCase().includes(placesSearchQuery.toLowerCase()));
    }
    setFilteredPlaces(list);
  }, [selectedCategory, placesSearchQuery, places]);

  if (loading || !destination) {
    return <ScrapingAnimationScreen query={nameParam} isActive={true} />;
  }

  // Calculate distance from current GPS position
  const parseCoord = (val: any, fallback: number): number => {
    if (val === undefined || val === null) return fallback;
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? fallback : num;
  };

  const startCoords: [number, number] = [
    parseCoord(currentGPS?.lat, 48.8566),
    parseCoord(currentGPS?.lon, 2.3522)
  ];
  const destCoords: [number, number] = [
    parseCoord(destination.lat ?? (destination as any).latitude, 48.8566),
    parseCoord(destination.lon ?? (destination as any).longitude, 2.3522)
  ];
  
  // Transit information
  const transitOptions = [
    { mode: 'Bus', freq: 'Every 8-15 mins', cost: '$1.50 - $3.00' },
    { mode: 'Metro / Subway', freq: 'Every 3-6 mins', cost: '$2.00 - $4.00' },
    { mode: 'Train', freq: 'Scheduled hourly', cost: '$5.00 - $15.00' },
    { mode: 'Taxi / Ride Share', freq: 'On demand 24/7', cost: '$12.00 - $25.00' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-28 transition-colors duration-300">
      
      {/* Clickable Project Name */}
      <div className="px-6 pt-4 pb-2 bg-slate-50 dark:bg-slate-950 max-w-md mx-auto w-full flex justify-between items-center transition-colors">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 font-sans font-extrabold tracking-widest text-xs text-green-600 dark:text-green-400 hover:opacity-85 cursor-pointer transition-opacity animate-fade-in"
        >
          <Compass className="w-4 h-4 text-green-500 animate-spin-slow" />
          <span>TRAVEL GUIDE</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative h-[280px] w-full">
        <img 
          src={destination.imageUrl} 
          alt={destination.name}
          className="w-full h-full object-cover filter brightness-75"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/20 to-slate-950/30" />
        
        {/* Navigation Overlays */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/chat')}
              className="p-2.5 bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 text-white cursor-pointer hover:scale-105"
              title="Voice Assistant Chat"
            >
              <Volume2 size={20} />
            </button>
            <button 
              onClick={isDownloaded ? handleDeleteDownload : handleDownload}
              disabled={downloading}
              className={`p-2.5 bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 text-white cursor-pointer hover:scale-105 transition-all ${isDownloaded ? 'text-green-400 border-green-500/35 bg-green-950/20' : ''}`}
              title={isDownloaded ? "Delete Offline Guide" : "Download Guide Offline"}
            >
              {downloading ? (
                <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              ) : isDownloaded ? (
                <CheckCircle2 size={20} className="text-green-400" />
              ) : (
                <Download size={20} />
              )}
            </button>
            <button 
              onClick={() => toggleFavorite(places[0] || ({} as PlaceInfo))}
              className="p-2.5 bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 text-white cursor-pointer hover:scale-105"
            >
              <Heart size={20} className={isFavorite(places[0]?.id) ? 'fill-red-500 text-red-500' : ''} />
            </button>
          </div>
        </div>

        {/* Hero Meta */}
        <div className="absolute bottom-4 left-6 right-6 z-15 flex flex-col gap-2">
          <div className="inline-flex mr-auto items-center gap-1 bg-green-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            ★ {destination.rating}
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none mt-1">
            {destination.name}
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            {destination.country}
          </p>
        </div>
      </div>

      {!isOnline && (
        <div className="max-w-md mx-auto px-6 mt-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-2xl flex items-center gap-2 text-xs font-medium">
            <AlertTriangle size={15} />
            <span>Serving cache data. Offline mode active.</span>
          </div>
        </div>
      )}

      {/* Quick Navigation Tabs */}
      <div className="max-w-md mx-auto px-6 mt-6">
        <div className="flex bg-slate-200/55 dark:bg-slate-900/60 backdrop-blur-md p-1 rounded-2xl border border-slate-200/20 dark:border-slate-800/10">
          {(['info', 'weather', 'places', 'rules'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl capitalize cursor-pointer transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'info' ? 'About' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-md mx-auto px-6 mt-6">
        
        {/* Tab 1: Info */}
        {activeTab === 'info' && (
          <div className="flex flex-col gap-6 animate-slide-up">
            
            {/* Description */}
            <GlassCard hoverEffect={false}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Overview</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {destination.description}
              </p>
              
              {/* Travel Info Table */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-[10px] text-slate-400">Avg Cost / Day</p>
                    <p className="font-bold">{currencySym}{destination.averageDailyCost}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-[10px] text-slate-400">Best Time to Visit</p>
                    <p className="font-bold truncate max-w-[120px]">{destination.bestTimeToVisit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-[10px] text-slate-400">Opening Hours</p>
                    <p className="font-bold">{destination.openingHours}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-[10px] text-slate-400">Entry Fee</p>
                    <p className="font-bold">{destination.entryFee === 0 ? 'Free' : `${currencySym}${destination.entryFee}`}</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* AI Trip Planner Button */}
            <button
              onClick={() => navigate(`/ai-planner?dest=${encodeURIComponent(destination.name)}`)}
              className="w-full bg-linear-to-r from-green-500 via-emerald-500 to-green-600 hover:scale-[1.02] active:scale-95 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-green-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer text-sm"
            >
              <Sparkles className="w-4 h-4 text-green-100" />
              <span>Generate AI Trip Itinerary</span>
            </button>

            {/* Map Navigation Panel */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Route & Location</h3>
              <LeafletMap 
                center={startCoords} 
                routeTo={destCoords}
                markers={[{ 
                  lat: destCoords[0], 
                  lon: destCoords[1], 
                  popupText: destination.name, 
                  type: 'landmark' 
                }]}
                height="220px"
              />
            </div>

            {/* Local Transit Options */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Transit Modes</h3>
              <div className="grid grid-cols-2 gap-2">
                {transitOptions.map((tr, idx) => (
                  <GlassCard key={idx} hoverEffect={false} className="p-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">{tr.mode}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{tr.freq}</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1">{tr.cost}</p>
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* Gallery Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Photos Gallery</h3>
              <div className="grid grid-cols-3 gap-2">
                {places.map((place, idx) => (
                  <div
                    key={idx}
                    onClick={() => setFullscreenImage(place.imageUrl)}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <img 
                      src={place.imageUrl} 
                      alt={place.name} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/10 hover:bg-black/30 transition-all" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Weather */}
        {activeTab === 'weather' && weather && (
          <div className="flex flex-col gap-6 animate-slide-up">
            
            {/* Current Weather Display */}
            <GlassCard hoverEffect={false} className="flex flex-col items-center py-6">
              <span className="text-5xl">{weather.icon}</span>
              <h3 className="text-3xl font-extrabold mt-3">{weather.temp}°C</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{weather.description}</p>
              
              <div className="grid grid-cols-2 gap-8 w-full mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800/50 text-center text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">Relative Humidity</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{weather.humidity}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Wind Velocity</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{weather.windSpeed} km/h</p>
                </div>
              </div>
            </GlassCard>

            {/* 5-Day Forecast Grid */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">5-Day Weather Forecast</h3>
              <div className="flex flex-col gap-1.5">
                {weather.forecast.map((f, idx) => (
                  <GlassCard key={idx} hoverEffect={false} className="flex justify-between items-center py-3 px-4">
                    <span className="text-xs font-bold w-20">{f.date}</span>
                    <span className="text-xl" title={f.description}>{f.icon}</span>
                    <span className="text-xs text-slate-400 truncate max-w-[120px] text-left ml-2">{f.description}</span>
                    <span className="text-xs font-bold text-right ml-auto text-slate-700 dark:text-slate-200">
                      {f.tempMax}° / {f.tempMin}°
                    </span>
                  </GlassCard>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Places */}
        {activeTab === 'places' && (
          <div className="flex flex-col gap-4 animate-slide-up">
            
            {/* Inner Places Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search sights, hotels, eats..."
                value={placesSearchQuery}
                onChange={(e) => setPlacesSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* Sights Category Filter Slider */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <cat.icon size={11} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Places Result Cards */}
            <div className="flex flex-col gap-2.5">
              {filteredPlaces.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  No places matching criteria. Try choosing another category!
                </div>
              ) : (
                filteredPlaces.map((place) => (
                  <GlassCard
                    key={place.id}
                    onClick={() => navigate(`/place/${place.id}`)}
                    className="flex gap-3.5 py-3 px-3 relative"
                  >
                    <img 
                      src={place.imageUrl} 
                      alt={place.name} 
                      className="w-16 h-16 object-cover rounded-xl shadow-sm"
                      loading="lazy"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold leading-tight">{place.name}</h4>
                        <p className="text-[9px] text-slate-400 capitalize mt-0.5">{place.type}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-2">
                        <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md font-bold">
                          ★ {place.rating}
                        </span>
                        <span className="text-slate-500 font-semibold flex items-center gap-0.5">
                          <Clock size={10} /> {place.avgVisitTime}m
                        </span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                           {place.entryFee === 0 ? 'Free' : `${currencySym}${place.entryFee}`}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>

          </div>
        )}

        {/* Tab 4: Rules & Guidelines */}
        {activeTab === 'rules' && (
          <div className="flex flex-col gap-5 animate-slide-up">
            
            {/* Entry Rules */}
            <GlassCard hoverEffect={false}>
              <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                <Compass className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Visa & Document Rules</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {destination.rules.visa}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Documents Required:</p>
                {destination.rules.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Local Laws */}
            <GlassCard hoverEffect={false}>
              <div className="flex items-center gap-2 mb-2 text-red-500">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Important Local Laws</h3>
              </div>
              <div className="flex flex-col gap-2.5">
                {destination.rules.laws.map((law, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-red-500 mt-0.5">⚠️</span>
                    <span>{law}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Restricted items */}
            <GlassCard hoverEffect={false}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Restricted Customs & Actions</h3>
              
              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Banned/Restricted Products</h4>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {destination.rules.restrictedProducts.map((p, idx) => <li key={idx} className="py-0.5">{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Offensive/Forbidden Actions</h4>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {destination.rules.restrictedActions.map((a, idx) => <li key={idx} className="py-0.5">{a}</li>)}
                  </ul>
                </div>
              </div>
            </GlassCard>

            {/* Emergency Hotline Services */}
            <GlassCard hoverEffect={false} className="border border-red-500/20 bg-red-500/5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-500 mb-3">Emergency Hotline Services</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase">Police</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{destination.emergency.police}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase">Ambulance</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{destination.emergency.ambulance}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase">Fire department</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{destination.emergency.fire}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase">Tourist Helpline</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">{destination.emergency.helpline}</p>
                </div>
              </div>

              {(destination.emergency as any).hospitals && (destination.emergency as any).hospitals.length > 0 && (
                <div className="mt-4 pt-3 border-t border-red-500/10 text-xs">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1.5">Recommended Hospitals & Clinics:</p>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 flex flex-col gap-0.5 font-sans">
                    {(destination.emergency as any).hospitals.map((h: string, idx: number) => (
                      <li key={idx} className="py-0.5">{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </GlassCard>

          </div>
        )}

      </div>

      {/* Fullscreen Image Overlay Viewer */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center cursor-pointer p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <img 
            src={fullscreenImage} 
            alt="Fullscreen view" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
          <span className="absolute top-6 right-6 text-white text-xs font-bold bg-white/10 px-3.5 py-1.5 rounded-full">Close</span>
        </div>
      )}

    </div>
  );
};
