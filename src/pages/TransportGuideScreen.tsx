import React, { useState } from 'react';
import { 
  ChevronLeft, Truck, MapPin, Train, AlertTriangle, Compass
} from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { useTripStore } from '../store/useTripStore';
import { useNetworkStatus } from '../services/capacitor';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ScrapingAnimationScreen } from '../components/common/ScrapingAnimationScreen';
import { getBackendApiUrl, getBackendBaseUrl } from '../services/apiConfig';

interface TransitRoute {
  serviceNumber: string;
  routeName: string;
  type: 'Bus' | 'Metro' | 'Train' | 'Ferry' | 'Tram' | 'Airplane';
  source: string;
  destination: string;
  frequency: string;
  duration: number; // in mins
  pricing: { tier: string; fare: number }[];
  stops: { name: string; etaOffset: number; lat: number; lon: number }[];
  operatingHours?: string;
  travelNotes?: string;
}

export const TransportGuideScreen: React.FC = () => {
  const navigate = useNavigate();
  const { 
    scrapedDestinations, 
    transportRoutes, 
    cityToCityRoutes, 
    addTransportRoute, 
    addCityToCityRoute,
    addScrapedDestination
  } = useTripStore();

  const [cityQuery, setCityQuery] = useState('Paris');
  const [transitType, setTransitType] = useState<'Bus' | 'Metro' | 'Train' | 'Ferry' | 'Tram'>('Metro');
  const [searchMode, setSearchMode] = useState<'route' | 'places'>('route');
  
  // Search inputs
  const [serviceInput, setServiceInput] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  // Results & Loading
  const [matchedRoutes, setMatchedRoutes] = useState<TransitRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<TransitRoute | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const isOnline = useNetworkStatus();

  if (loadingMsg && false) {
    console.log(loadingMsg);
  }

  const handleCityGuideSearch = async () => {
    setSearched(true);
    setSearchError(null);
    setSelectedRoute(null);
    const cityKey = cityQuery.toLowerCase().trim();

    if (!cityKey) {
      setSearchError('Please specify a city first.');
      return;
    }

    if (!isOnline) {
      setSearchError('Offline mode: Cannot generate new city transit guide while offline.');
      return;
    }

    setLoading(true);
    setLoadingMsg(`Scraping official routes and timetables for ${cityQuery}...`);
    try {
      const response = await axios.get(
        `${getBackendApiUrl()}/city-transit-guide?city=${encodeURIComponent(cityQuery)}`,
        { timeout: 90000 }
      );
      
      const data = response.data;
      if (data && data.routes && data.routes.length > 0) {
        const parsedRoutes: TransitRoute[] = data.routes.map((r: any) => ({
          serviceNumber: r.serviceNumber || 'Line',
          routeName: r.routeName || 'Transit Route',
          type: r.type || 'Bus',
          source: r.source || 'Origin',
          destination: r.destination || 'Destination',
          frequency: r.frequency || 'Regular schedule',
          duration: r.duration || 30,
          pricing: (r.pricing && r.pricing.length > 0)
            ? r.pricing.map((p: any) => ({
                tier: p.tier || 'Ticket',
                fare: typeof p.fare === 'number' ? p.fare : parseFloat(String(p.fare).replace(/[^0-9.]/g, '')) || 2.00
              }))
            : [{ tier: 'Estimated single fare', fare: 2.00 }],
          stops: (r.stops || []).map((s: any) => ({
            name: s.name || 'Station',
            etaOffset: s.etaOffset || 0,
            lat: typeof s.latitude === 'number' ? s.latitude : parseFloat(s.latitude) || 48.8566,
            lon: typeof s.longitude === 'number' ? s.longitude : parseFloat(s.longitude) || 2.3522
          })),
          operatingHours: r.operatingHours,
          travelNotes: r.travelNotes
        }));

        parsedRoutes.forEach((route) => {
          addTransportRoute(route);
        });

        addScrapedDestination({
          id: cityKey,
          name: data.city || cityQuery,
          country: data.country || '',
          state: data.state || '',
          latitude: data.latitude,
          longitude: data.longitude,
          transportRoutes: data.routes || []
        });

        const typesInCity = Array.from(new Set(parsedRoutes.map(r => r.type)));
        if (typesInCity.length > 0 && !typesInCity.includes(transitType)) {
          setTransitType(typesInCity[0] as any);
        }

        setMatchedRoutes(parsedRoutes);
      } else {
        setSearchError(`No transit routes could be extracted for ${cityQuery}.`);
      }
    } catch (err: any) {
      console.error('Failed to generate city transit guide:', err);
      setSearchError(err.response?.data?.details || err.message || 'Failed to generate city transit guide.');
    } finally {
      setLoading(false);
    }
  };

  const displayRoutes = matchedRoutes.filter(
    (route) => route.type.toLowerCase() === transitType.toLowerCase()
  );

  const transitTypes = [
    { id: 'Metro', label: 'Metro', icon: Train },
    { id: 'Bus', label: 'Bus', icon: Truck },
    { id: 'Train', label: 'Train', icon: Train },
    { id: 'Tram', label: 'Tram', icon: Train },
  ];

  // Static rich transit database
  const transitDatabase: Record<string, TransitRoute[]> = {
    paris: [
      {
        serviceNumber: '1',
        routeName: 'La Défense - Château de Vincennes',
        type: 'Metro',
        source: 'La Défense',
        destination: 'Château de Vincennes',
        frequency: 'Every 2-4 mins',
        duration: 35,
        pricing: [
          { tier: 'Single Ticket (t+)', fare: 2.10 },
          { tier: 'Daily Mobilis pass', fare: 8.40 }
        ],
        stops: [
          { name: 'La Défense', etaOffset: 0, lat: 48.8919, lon: 2.2384 },
          { name: 'Charles de Gaulle - Étoile', etaOffset: 8, lat: 48.8738, lon: 2.2950 },
          { name: 'Champs-Élysées - Clemenceau', etaOffset: 12, lat: 48.8677, lon: 2.3135 },
          { name: 'Louvre - Rivoli', etaOffset: 18, lat: 48.8608, lon: 2.3409 },
          { name: 'Bastille', etaOffset: 24, lat: 48.8531, lon: 2.3691 },
          { name: 'Château de Vincennes', etaOffset: 35, lat: 48.8439, lon: 2.4397 }
        ]
      },
      {
        serviceNumber: '42',
        routeName: 'Gare du Nord - Cours de l\'Île Seguin',
        type: 'Bus',
        source: 'Gare du Nord',
        destination: 'Cours de l\'Île Seguin',
        frequency: 'Every 10-15 mins',
        duration: 50,
        pricing: [
          { tier: 'Single Bus Ticket', fare: 2.10 }
        ],
        stops: [
          { name: 'Gare du Nord', etaOffset: 0, lat: 48.8809, lon: 2.3553 },
          { name: 'Opéra', etaOffset: 12, lat: 48.8706, lon: 2.3321 },
          { name: 'Place de la Concorde', etaOffset: 22, lat: 48.8656, lon: 2.3212 },
          { name: 'Eiffel Tower', etaOffset: 35, lat: 48.8584, lon: 2.2945 },
          { name: 'Pont de Sèvres', etaOffset: 50, lat: 48.8294, lon: 2.2289 }
        ]
      }
    ],
    tokyo: [
      {
        serviceNumber: 'JY',
        routeName: 'Yamanote Circular Line',
        type: 'Train',
        source: 'Tokyo Station (Inner Loop)',
        destination: 'Tokyo Station (Outer Loop)',
        frequency: 'Every 3-5 mins',
        duration: 60,
        pricing: [
          { tier: 'Standard Base Fare', fare: 1.50 },
          { tier: 'JR Tokyo Area 1-Day Pass', fare: 6.80 }
        ],
        stops: [
          { name: 'Tokyo Station', etaOffset: 0, lat: 35.6812, lon: 139.7671 },
          { name: 'Akihabara', etaOffset: 4, lat: 35.6983, lon: 139.7731 },
          { name: 'Ueno', etaOffset: 8, lat: 35.7138, lon: 139.7773 },
          { name: 'Ikebukuro', etaOffset: 20, lat: 35.7295, lon: 139.7109 },
          { name: 'Shinjuku', etaOffset: 29, lat: 35.6896, lon: 139.6917 },
          { name: 'Shibuya', etaOffset: 36, lat: 35.6580, lon: 139.7016 },
          { name: 'Shinagawa', etaOffset: 48, lat: 35.6302, lon: 139.7388 },
          { name: 'Tokyo Station Loop', etaOffset: 60, lat: 35.6812, lon: 139.7671 }
        ]
      }
    ]
  };

  const getCityRoutes = (cityKey: string, typeFilter: string): TransitRoute[] => {
    const cachedCity = scrapedDestinations.find(
      (d: any) => (d.name || d.id || '').toLowerCase().trim() === cityKey || d.id === cityKey
    );
    
    // Check if this city has dynamic routes for the SELECTED transit type
    const hasDynamicType = !!(cachedCity && cachedCity.transportRoutes && 
      cachedCity.transportRoutes.some((r: any) => r.type === typeFilter));

    if (hasDynamicType && cachedCity) {
      // Serve dynamically from scraped guide
      return cachedCity.transportRoutes
        .filter((r: any) => r.type === typeFilter)
        .map((r: any) => ({
          serviceNumber: r.serviceNumber || 'Line',
          routeName: r.routeName || 'Transit Route',
          type: r.type || 'Bus',
          source: r.source || 'Origin',
          destination: r.destination || r.routeDest || 'Destination',
          frequency: r.frequency || 'Regular schedule',
          duration: r.duration || 30,
          pricing: (r.pricing && r.pricing.length > 0)
            ? r.pricing.map((p: any) => {
                const rawFare = p.fare ?? p.price;
                const parsedFare = typeof rawFare === 'number' ? rawFare : parseFloat(String(rawFare).replace(/[^0-9.]/g, ''));
                return {
                  tier: p.tier || 'Ticket',
                  fare: isNaN(parsedFare) ? 2.00 : parsedFare
                };
              })
            : [{ tier: 'Estimated single fare', fare: typeof r.estimatedFare === 'number' ? r.estimatedFare : parseFloat(String(r.estimatedFare || '2.00').replace(/[^0-9.]/g, '')) || 2.00 }],
          stops: (r.stops || []).map((s: any) => {
            const rawLat = s.lat ?? s.latitude;
            const rawLon = s.lon ?? s.longitude;
            const parsedLat = rawLat !== undefined && rawLat !== null ? parseFloat(rawLat) : cachedCity.latitude ?? 48.8566;
            const parsedLon = rawLon !== undefined && rawLon !== null ? parseFloat(rawLon) : cachedCity.longitude ?? 2.3522;
            return {
              name: s.name || 'Station',
              etaOffset: s.etaOffset || 0,
              lat: isNaN(parsedLat) ? (cachedCity.latitude ?? 48.8566) : parsedLat,
              lon: isNaN(parsedLon) ? (cachedCity.longitude ?? 2.3522) : parsedLon
            };
          }),
          operatingHours: r.operatingHours,
          travelNotes: r.travelNotes
        }));
    }
    
    // Serve static mock data as fallback (others static)
    const staticRoutes = transitDatabase[cityKey] || transitDatabase['paris'];
    return staticRoutes.filter((r) => r.type === typeFilter);
  };

  // Perform route lookup
  const handleRouteSearch = async () => {
    setSearched(true);
    setSearchError(null);
    setSelectedRoute(null);
    const cityKey = cityQuery.toLowerCase().trim();

    if (!cityKey) {
      setSearchError('Please specify an active city or country first.');
      return;
    }

    // 1. Check local city guide caches
    const cityRoutes = getCityRoutes(cityKey, transitType);
    let matches = cityRoutes.filter((r) => {
      const matchNumber = serviceInput.trim() 
        ? r.serviceNumber.toLowerCase() === serviceInput.toLowerCase()
        : true;
      return matchNumber;
    });

    // 2. Check general transport route caches (Zustand transportRoutes)
    if (matches.length === 0 && serviceInput.trim()) {
      const globalMatch = transportRoutes.find(
        (r) => r.serviceNumber.toLowerCase() === serviceInput.toLowerCase().trim() && r.type === transitType
      );
      if (globalMatch) {
        matches = [globalMatch];
      }
    }

    // 3. Fallback: If missing, perform web scraping via API
    if (matches.length === 0 && serviceInput.trim()) {
      if (!isOnline) {
        setSearchError('Offline mode: Could not find this route in local database cache.');
        return;
      }

      setLoading(true);
      setLoadingMsg(`Scraping Route ${serviceInput} stops & timetable...`);
      try {
        const response = await axios.get(
          `${getBackendApiUrl()}/scrape-route?routeNumber=${encodeURIComponent(serviceInput)}&city=${encodeURIComponent(cityQuery)}`,
          { timeout: 30000 }
        );
        const rawRoute = response.data;
        if (rawRoute && rawRoute.serviceNumber) {
          const newRoute: TransitRoute = {
            serviceNumber: rawRoute.serviceNumber,
            routeName: rawRoute.routeName || `Line ${rawRoute.serviceNumber}`,
            type: rawRoute.type || 'Bus',
            source: rawRoute.source || 'Origin',
            destination: rawRoute.destination || 'Destination',
            frequency: rawRoute.frequency || 'Regular schedule',
            duration: rawRoute.duration || 30,
            pricing: (rawRoute.pricing && rawRoute.pricing.length > 0)
              ? rawRoute.pricing.map((p: any) => {
                  const rawFare = p.fare ?? p.price;
                  const parsedFare = typeof rawFare === 'number' ? rawFare : parseFloat(String(rawFare).replace(/[^0-9.]/g, ''));
                  return {
                    tier: p.tier || 'Ticket',
                    fare: isNaN(parsedFare) ? 2.00 : parsedFare
                  };
                })
              : [{ tier: 'Estimated single fare', fare: typeof rawRoute.estimatedFare === 'number' ? rawRoute.estimatedFare : parseFloat(String(rawRoute.estimatedFare || '2.00').replace(/[^0-9.]/g, '')) || 2.00 }],
            stops: (rawRoute.stops || []).map((s: any) => {
              const rawLat = s.lat ?? s.latitude;
              const rawLon = s.lon ?? s.longitude;
              const parsedLat = rawLat !== undefined && rawLat !== null ? parseFloat(rawLat) : 48.8566;
              const parsedLon = rawLon !== undefined && rawLon !== null ? parseFloat(rawLon) : 2.3522;
              return {
                name: s.name || 'Station',
                etaOffset: s.etaOffset || 0,
                lat: isNaN(parsedLat) ? 48.8566 : parsedLat,
                lon: isNaN(parsedLon) ? 2.3522 : parsedLon
              };
            }),
            operatingHours: rawRoute.operatingHours,
            travelNotes: rawRoute.travelNotes
          };
          addTransportRoute(newRoute);
          matches = [newRoute];
          if (newRoute.type && newRoute.type !== transitType) {
            setTransitType(newRoute.type as any);
          }
        }
      } catch (err: any) {
        console.error('Failed to scrape route:', err);
        setSearchError('Failed to scrape timetable. Serving default mock matches.');
        matches = cityRoutes;
      } finally {
        setLoading(false);
      }
    }

    setMatchedRoutes(matches);
  };

  // Perform origin-destination matching route search
  const handlePlacesSearch = async () => {
    setSearched(true);
    setSearchError(null);
    setSelectedRoute(null);
    
    const cityKey = cityQuery.toLowerCase().trim();
    if (!cityKey) {
      setSearchError('Please specify an active city or country first.');
      return;
    }
    
    if (!fromInput.trim() || !toInput.trim()) {
      setSearchError('Please fill in both origin and terminal stations.');
      return;
    }

    const cityRoutes = getCityRoutes(cityKey, transitType);

    // 1. Check local city routes
    let matches = cityRoutes.filter((r) => {
      const stopsList = r.stops.map(s => s.name.toLowerCase());
      const hasFrom = stopsList.some(name => name.includes(fromInput.toLowerCase().trim()));
      const hasTo = stopsList.some(name => name.includes(toInput.toLowerCase().trim()));
      return hasFrom && hasTo;
    });

    // 2. Check cached cityToCity routes
    if (matches.length === 0) {
      const cacheKey = `${fromInput.toLowerCase().trim()}_to_${toInput.toLowerCase().trim()}`;
      const cached = cityToCityRoutes.find(
        (r) => `${r.from.toLowerCase()}_to_${r.to.toLowerCase()}` === cacheKey
      );
      if (cached && cached.options) {
        // Map scraped options to TransitRoutes
        matches = [cached.options.bestOption, cached.options.cheapestOption, cached.options.fastestOption, ...(cached.options.alternatives || [])]
          .filter(Boolean)
          .map((o: any) => ({
            serviceNumber: o.serviceNumber || 'Route',
            routeName: o.routeName || `${o.type} Transit`,
            type: o.type || 'Train',
            source: o.source || fromInput,
            destination: o.destination || toInput,
            frequency: 'Scheduled departures',
            duration: o.duration || 120,
            pricing: [{ tier: 'Estimated single fare', fare: o.fare || 15.00 }],
            stops: [
              { name: o.source || fromInput, etaOffset: 0, lat: 48.8566, lon: 2.3522 },
              { name: o.destination || toInput, etaOffset: o.duration || 120, lat: 48.8738, lon: 2.2950 }
            ]
          }));
      }
    }

    // 3. Fallback: If missing, perform web scraping via API
    if (matches.length === 0) {
      if (!isOnline) {
        setSearchError('Offline mode: Could not find connecting lines in local database cache.');
        return;
      }

      setLoading(true);
      setLoadingMsg(`Scraping travel options between ${fromInput} and ${toInput}...`);
      try {
        const response = await axios.get(
          `${getBackendApiUrl()}/scrape-transit?from=${encodeURIComponent(fromInput)}&to=${encodeURIComponent(toInput)}`,
          { timeout: 45000 }
        );
        const options = response.data;
        if (options && (options.bestOption || options.cheapestOption)) {
          // Save to store
          addCityToCityRoute({
            from: fromInput,
            to: toInput,
            options
          });

          // Convert options list for UI rendering
          matches = [options.bestOption, options.cheapestOption, options.fastestOption, ...(options.alternatives || [])]
            .filter(Boolean)
            .map((o: any) => ({
              serviceNumber: o.serviceNumber || 'Transit Line',
              routeName: o.routeName || `${o.type} Option`,
              type: o.type || 'Train',
              source: o.source || fromInput,
              destination: o.destination || toInput,
              frequency: 'See details in AI Assistant',
              duration: o.duration || 90,
              pricing: [{ tier: 'Approx Fare', fare: o.fare || 10.00 }],
              stops: [
                { name: o.source || fromInput, etaOffset: 0, lat: 48.8566, lon: 2.3522 },
                { name: o.destination || toInput, etaOffset: o.duration || 90, lat: 48.8738, lon: 2.2950 }
              ]
            }));
        }
      } catch (err) {
        console.error('Failed to scrape transit options:', err);
        setSearchError('Scraping routes failed. Showing general city transit matches.');
        matches = cityRoutes;
      } finally {
        setLoading(false);
      }
    }

    const typesInMatches = Array.from(new Set(matches.map(r => r.type)));
    if (typesInMatches.length > 0 && !typesInMatches.includes(transitType)) {
      setTransitType(typesInMatches[0] as any);
    }

    setMatchedRoutes(matches);
  };

  const handleSelectRoute = (route: TransitRoute) => {
    setSelectedRoute(route);
  };

  // Helper to format currency based on city name
  const getCurrencySymbol = (city: string) => {
    const lower = city.toLowerCase();
    if (lower.includes('vijayawada') || lower.includes('kadapa') || lower.includes('delhi') || lower.includes('mumbai') || lower.includes('hyderabad') || lower.includes('bangalore') || lower.includes('chennai') || lower.includes('india')) {
      return '₹';
    }
    return '$';
  };

  // Helper to format arrival time based on start hour and etaOffset
  const getStopArrivalTime = (operatingHours: string, etaOffset: number) => {
    try {
      const match = operatingHours.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const startHour = parseInt(match[1]);
        const startMin = parseInt(match[2]);
        const totalMins = startHour * 60 + startMin + etaOffset;
        const arrivalHour = Math.floor(totalMins / 60) % 24;
        const arrivalMin = totalMins % 60;
        const period = arrivalHour >= 12 ? 'PM' : 'AM';
        const formattedHour = arrivalHour % 12 === 0 ? 12 : arrivalHour % 12;
        const formattedMin = arrivalMin.toString().padStart(2, '0');
        return `${formattedHour}:${formattedMin} ${period}`;
      }
    } catch (e) {
      // fallback
    }
    return null;
  };

  // Helper to estimate ticket price per stop proportionally
  const getStopFare = (route: TransitRoute, index: number) => {
    if (!route.pricing || route.pricing.length === 0) return 2.00;
    const maxFare = route.pricing[0].fare;
    if (index === 0) return 0.00;
    if (index === route.stops.length - 1) return maxFare;
    const proportion = index / (route.stops.length - 1);
    const calculated = Math.round((maxFare * proportion) * 10) / 10;
    return calculated > 0 ? calculated : 1.00;
  };

  const getAvailableTypesForCity = (cityKey: string): string[] => {
    const key = cityKey.toLowerCase().trim();
    if (!key) return ['Bus', 'Metro', 'Train', 'Tram'];

    const types = new Set<string>();

    // 1. Check if matchedRoutes are present for the current search session
    if (matchedRoutes.length > 0) {
      matchedRoutes.forEach(r => {
        if (r.type) types.add(r.type);
      });
    }

    // 2. Check scrapedDestinations cache
    const cachedCity = scrapedDestinations.find(
      (d: any) => (d.name || d.id || '').toLowerCase().trim() === key || d.id === key
    );
    if (cachedCity && cachedCity.transportRoutes && Array.isArray(cachedCity.transportRoutes)) {
      cachedCity.transportRoutes.forEach((r: any) => {
        if (r.type) types.add(r.type);
      });
    }

    // 3. Check if the city exists in static database
    if (transitDatabase[key]) {
      transitDatabase[key].forEach((r) => {
        if (r.type) types.add(r.type);
      });
    }

    // If we found any specific active modes from cache/results/static, return them
    if (types.size > 0) {
      return Array.from(types);
    }

    // Fallback: If absolutely no info is found for this city, default to all enabled
    return ['Bus', 'Metro', 'Train', 'Tram'];
  };

  const availableTypes = getAvailableTypesForCity(cityQuery);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-28 transition-colors duration-300">
      
      {/* Scraper Loading Screen */}
      <ScrapingAnimationScreen query={cityQuery} isActive={loading} />

      {/* Header */}
      <div className="px-6 pt-6 pb-2 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 font-sans font-extrabold tracking-widest text-xs text-green-600 dark:text-green-400 hover:opacity-85 cursor-pointer transition-opacity"
          >
            <Compass className="w-4 h-4 text-green-500 animate-spin-slow" />
            <span>TRAVEL GUIDE</span>
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Public Transit Map</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h1 className="text-2xl font-extrabold tracking-tight mt-0">Transit Guide</h1>
            {!isOnline && (
              <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold uppercase">Offline</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 flex flex-col gap-5">
        
        {searchError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex flex-col gap-1.5 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0" />
              <span className="font-semibold">{searchError}</span>
            </div>
            {(searchError.toLowerCase().includes('network error') || searchError.toLowerCase().includes('failed') || searchError.toLowerCase().includes('timeout')) && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal border-t border-red-500/10 pt-1.5 mt-0.5 font-sans">
                💡 <strong>Mobile Setup Tip:</strong> Ensure your phone is connected to the same Wi-Fi network as your PC. You can configure your PC's IP address (active: <code className="bg-black/10 dark:bg-black/30 px-1 py-0.5 rounded font-mono">{getBackendBaseUrl()}</code>) inside the Settings button on the Welcome Screen.
              </p>
            )}
          </div>
        )}

        {/* City Input */}
        <GlassCard hoverEffect={false}>
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Active City</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="E.g. Paris, Tokyo, London..."
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleCityGuideSearch}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0"
            >
              Scrape City Transit
            </button>
          </div>
        </GlassCard>

        {/* Category Icons Selector */}
        <div className="grid grid-cols-4 gap-2">
          {transitTypes.map((t) => {
            const isAvailable = availableTypes.includes(t.id);
            return (
              <button
                key={t.id}
                disabled={!isAvailable}
                onClick={() => setTransitType(t.id as any)}
                className={`py-2 px-1 text-[10px] font-bold rounded-xl cursor-pointer transition-all border flex flex-col items-center gap-1 shadow-sm ${
                  !isAvailable
                    ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200/30 dark:border-slate-900/30 text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
                    : transitType === t.id
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <t.icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toggle Mode Search by Route or Places */}
        <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/20 dark:border-slate-800/10">
          <button
            onClick={() => { setSearchMode('route'); setSearched(false); setSelectedRoute(null); }}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
              searchMode === 'route' ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            Search by Line No.
          </button>
          <button
            onClick={() => { setSearchMode('places'); setSearched(false); setSelectedRoute(null); }}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
              searchMode === 'places' ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            Search by Stations
          </button>
        </div>

        {/* Form Inputs based on mode */}
        {searchMode === 'route' ? (
          <GlassCard hoverEffect={false} className="flex gap-2">
            <input
              type="text"
              placeholder="E.g. 1, 42, JY..."
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 focus:outline-none"
            />
            <button
              onClick={handleRouteSearch}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Search
            </button>
          </GlassCard>
        ) : (
          <GlassCard hoverEffect={false} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="From stop (e.g. Louvre)"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 focus:outline-none"
              />
              <input
                type="text"
                placeholder="To stop (e.g. Bastille)"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 focus:outline-none"
              />
            </div>
            <button
              onClick={handlePlacesSearch}
              className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Find Matching Lines
            </button>
          </GlassCard>
        )}

        {/* Search Results list */}
        {searched && !selectedRoute && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Transit Options ({transitType})</h3>
            {displayRoutes.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                No matching {transitType} routes found for this search. Try searching or scraping again.
              </div>
            ) : (
              displayRoutes.map((route, idx) => (
                <GlassCard
                  key={idx}
                  onClick={() => handleSelectRoute(route)}
                  className="flex justify-between items-center py-3.5 px-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-extrabold text-sm border border-red-500/20">
                      {route.serviceNumber}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{route.routeName}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">{(route.stops || []).length} stations • {route.frequency}</p>
                    </div>
                  </div>
                  <ChevronLeft size={16} className="rotate-180 text-slate-400" />
                </GlassCard>
              ))
            )}
          </div>
        )}

        {/* Selected Route Detailed View */}
        {selectedRoute && (
          <div className="flex flex-col gap-6 animate-slide-up">
            
            {/* Go back to list button */}
            <button
              onClick={() => setSelectedRoute(null)}
              className="text-[10px] text-green-500 hover:text-green-600 font-bold flex items-center gap-1 cursor-pointer"
            >
              ← Back to search results
            </button>

            {/* Route Stop Line Map */}
            <GlassCard hoverEffect={false} className="overflow-hidden">
              <div className="flex justify-between items-center mb-5 border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Route Stop Alignment (Line Map)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedRoute.routeName} ({selectedRoute.type})</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full font-bold uppercase">
                    {selectedRoute.operatingHours || "Active"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col relative pl-2 pt-2 pb-2">
                {/* The vertical connector track line */}
                <div className="absolute left-[88px] top-6 bottom-6 w-[3px] bg-linear-to-b from-green-500 via-emerald-500 to-teal-500 rounded-full" />

                {(selectedRoute.stops || []).map((stop, sIdx) => {
                  const arrivalTime = getStopArrivalTime(selectedRoute.operatingHours || '06:00', stop.etaOffset);
                  const stopFare = getStopFare(selectedRoute, sIdx);
                  const isFirst = sIdx === 0;
                  const isLast = sIdx === (selectedRoute.stops || []).length - 1;
                  const symbol = getCurrencySymbol(cityQuery);

                  return (
                    <div key={sIdx} className="flex items-start gap-4 mb-6 last:mb-0 relative group">
                      
                      {/* Left: Timing / Departure estimation */}
                      <div className="w-16 text-right shrink-0 pt-0.5">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {arrivalTime || `${stop.etaOffset}m`}
                        </span>
                        {arrivalTime && (
                          <span className="block text-[8px] text-slate-400 font-bold mt-0.5">
                            +{stop.etaOffset} mins
                          </span>
                        )}
                      </div>

                      {/* Middle: Custom Node representation on track */}
                      <div className="relative flex items-center justify-center w-6 shrink-0 z-10">
                        {isFirst ? (
                          <div className="w-4 h-4 rounded-full bg-green-500 border-4 border-white dark:border-slate-900 shadow-md ring-2 ring-green-400 group-hover:scale-110 transition-transform" />
                        ) : isLast ? (
                          <div className="w-4 h-4 rounded-full bg-teal-600 border-4 border-white dark:border-slate-900 shadow-md ring-2 ring-teal-400 group-hover:scale-110 transition-transform" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-3 border-emerald-500 shadow-sm group-hover:bg-emerald-50 group-hover:dark:bg-emerald-950 transition-colors" />
                        )}
                      </div>

                      {/* Right: Station details (Stop name, ticket price) */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                            {stop.name}
                          </span>
                          <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 shrink-0">
                            {stopFare === 0 ? "Free" : `${symbol}${stopFare.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-0.5">
                          <span className="text-[8px] text-slate-400 uppercase font-semibold">
                            {isFirst ? "Origin Station" : isLast ? "Terminal Station" : `Stop #${sIdx + 1}`}
                          </span>
                          {stopFare > 0 && (
                            <span className="text-[8px] text-slate-400 font-bold">
                              Fare from start
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Fare matrix */}
            <GlassCard hoverEffect={false}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-3">Ticket & Pricing Info</h3>
              <div className="flex flex-col gap-2">
                {(selectedRoute.pricing || []).map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5 last:border-b-0">
                    <span className="text-slate-500">{p.tier}</span>
                    <span className="font-bold text-green-600 dark:text-green-400">${(Number(p.fare) || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

          </div>
        )}

      </div>
    </div>
  );
};
