import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Star, Clock, DollarSign, 
  ShieldAlert, Compass, Heart, ArrowRight, BookOpen, Train 
} from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { LeafletMap } from '../components/map/LeafletMap';
import { useTripStore } from '../store/useTripStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { getPlaces, PRELOADED_DESTINATIONS } from '../services/overpass';
import type { PlaceInfo } from '../services/overpass';
import { getCurrencySymbol } from '../utils/currency';
import { readDownloadedGuide, listDownloadedGuides } from '../services/offline';

export const PlaceDetailsScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const { location: currentGPS } = useGeolocation();
  const { toggleFavorite, isFavorite, scrapedDestinations } = useTripStore();
  
  const destId = place?.destinationId;
  const destination = scrapedDestinations.find(d => d.id === destId) || PRELOADED_DESTINATIONS.find(d => d.id === destId);
  const currencySym = destination?.currencySymbol || getCurrencySymbol(destination?.country);

  useEffect(() => {
    const loadPlaceDetails = async () => {
      setLoading(true);
      try {
        let foundPlace: PlaceInfo | null = null;
        let foundDest: any = null;

        // 1. Check inside Zustand store scrapedDestinations
        const storeState = useTripStore.getState();
        for (const dest of storeState.scrapedDestinations) {
          if (dest.places) {
            const match = dest.places.find((p: any) => p.id === id);
            if (match) {
              foundPlace = {
                id: match.id,
                destinationId: dest.id,
                name: match.name,
                type: match.type,
                lat: match.lat ?? match.latitude ?? dest.latitude,
                lon: match.lon ?? match.longitude ?? dest.longitude,
                imageUrl: match.imageUrl || '',
                description: match.description || '',
                history: match.history,
                rating: match.rating || 4.5,
                timings: match.timings || '09:00 - 18:00',
                entryFee: match.entryFee || 0,
                avgVisitTime: match.avgVisitTime || 60,
                transportRules: match.transportRules || [],
                nearbyServices: match.nearbyServices || [],
                hotels: match.hotels || [],
                restaurants: match.restaurants || []
              } as any;
              foundDest = dest;
              break;
            }
          }
        }

        // 2. Check inside offline downloaded files
        if (!foundPlace) {
          const downloads = await listDownloadedGuides();
          for (const downloadId of downloads) {
            const guide = await readDownloadedGuide(downloadId);
            if (guide && guide.places) {
              const match = guide.places.find((p: any) => p.id === id);
              if (match) {
                foundPlace = {
                  id: match.id,
                  destinationId: guide.id,
                  name: match.name,
                  type: match.type,
                  lat: match.lat ?? match.latitude ?? guide.latitude,
                  lon: match.lon ?? match.longitude ?? guide.longitude,
                  imageUrl: match.imageUrl || '',
                  description: match.description || '',
                  history: match.history,
                  rating: match.rating || 4.5,
                  timings: match.timings || '09:00 - 18:00',
                  entryFee: match.entryFee || 0,
                  avgVisitTime: match.avgVisitTime || 60,
                  transportRules: match.transportRules || [],
                  nearbyServices: match.nearbyServices || [],
                  hotels: match.hotels || [],
                  restaurants: match.restaurants || []
                } as any;
                foundDest = guide;
                break;
              }
            }
          }
        }

        // 3. Fallback search through preloaded lists (Paris, Tokyo, Rome)
        if (!foundPlace) {
          const cities = ['paris', 'tokyo', 'rome'];
          for (const city of cities) {
            const list = await getPlaces(0, 0, city);
            const matched = list.find(p => p.id === id);
            if (matched) {
              foundPlace = matched;
              break;
            }
          }
        }

        // 4. Default fallback generator
        if (!foundPlace) {
          const defaultList = await getPlaces(48.8566, 2.3522, 'paris');
          foundPlace = defaultList.find(p => p.id === id) || defaultList[0];
        }

        setPlace(foundPlace);

        // Fetch other places in the same destination for "Nearby"
        const parentId = foundPlace.destinationId || 'paris';
        let allDestPlaces: PlaceInfo[] = [];

        if (foundDest && foundDest.places) {
          allDestPlaces = foundDest.places;
        } else {
          allDestPlaces = await getPlaces(foundPlace.lat, foundPlace.lon, parentId);
        }

        const filteredNearby = allDestPlaces.filter(p => p.id !== foundPlace?.id).slice(0, 3);
        setNearbyPlaces(filteredNearby);

      } catch (err) {
        console.error('Error loading place details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlaceDetails();
  }, [id]);

  if (loading || !place) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <Clock className="w-8 h-8 text-green-500 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest mt-4">Loading details...</p>
      </div>
    );
  }

  const parseCoord = (val: any, fallback: number): number => {
    if (val === undefined || val === null) return fallback;
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? fallback : num;
  };

  const userCoords: [number, number] = [
    parseCoord(currentGPS?.lat, 48.8566),
    parseCoord(currentGPS?.lon, 2.3522)
  ];
  const placeCoords: [number, number] = [
    parseCoord(place.lat, 48.8566),
    parseCoord(place.lon, 2.3522)
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-28 transition-colors duration-300">
      
      {/* Clickable Project Name */}
      <div className="px-6 pt-4 pb-2 bg-slate-50 dark:bg-slate-950 max-w-md mx-auto w-full flex justify-between items-center transition-colors">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 font-sans font-extrabold tracking-widest text-xs text-green-600 dark:text-green-400 hover:opacity-85 cursor-pointer transition-opacity"
        >
          <Compass className="w-4 h-4 text-green-500 animate-spin-slow" />
          <span>TRAVEL GUIDE</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="relative h-[250px] w-full">
        <img 
          src={place.imageUrl} 
          alt={place.name} 
          className="w-full h-full object-cover filter brightness-75"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/20 to-slate-950/30" />
        
        {/* Back and Fav buttons */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            onClick={() => toggleFavorite(place)}
            className="p-2.5 bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 text-white cursor-pointer hover:scale-105"
          >
            <Heart size={20} className={isFavorite(place.id) ? 'fill-red-500 text-red-500' : ''} />
          </button>
        </div>

        {/* Title */}
        <div className="absolute bottom-4 left-6 right-6 z-15">
          <div className="flex items-center gap-1.5 bg-green-500/80 backdrop-blur-sm text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider w-fit mb-1.5">
            <Star className="w-2.5 h-2.5 fill-white" />
            <span>{place.rating} Rating</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight leading-snug">
            {place.name}
          </h2>
          <p className="text-[10px] text-slate-300 font-medium capitalize flex items-center gap-1 mt-0.5">
            <Compass size={12} /> {place.type}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 mt-6 flex flex-col gap-6 animate-slide-up">
        
        {/* About Place */}
        <GlassCard hoverEffect={false}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">About Place</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            {place.description}
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 text-center text-xs">
            <div className="flex flex-col items-center">
              <Clock className="w-4 h-4 text-green-500 mb-1" />
              <span className="text-[9px] text-slate-400 uppercase">Duration</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{place.avgVisitTime} Mins</span>
            </div>
            <div className="flex flex-col items-center">
              <DollarSign className="w-4 h-4 text-green-500 mb-1" />
              <span className="text-[9px] text-slate-400 uppercase">Entry Fee</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{place.entryFee === 0 ? 'Free' : `${currencySym}${place.entryFee}`}</span>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="w-4 h-4 text-green-500 mb-1" />
              <span className="text-[9px] text-slate-400 uppercase">Hours</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[100px]" title={place.timings}>{place.timings}</span>
            </div>
          </div>
        </GlassCard>

        {/* Hotel Details Card */}
        {place.type === 'hotel' && (place as any).hotels && (place as any).hotels.length > 0 && (
          <GlassCard hoverEffect={false}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3">Hotel Specifications</h3>
            <div className="flex flex-col gap-2.5 text-xs">
              {(place as any).hotels.map((h: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1.5 pb-2 last:pb-0 border-b last:border-b-0 border-slate-200/50 dark:border-slate-800/50 font-sans">
                  <div className="flex justify-between items-center font-bold">
                    <span>{h.name}</span>
                    <span className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">★ {h.starRating} Stars</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Price Tier: <span className="font-semibold text-slate-600 dark:text-slate-200 capitalize">{h.priceRange}</span></p>
                  {h.amenities && h.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {h.amenities.map((a: string, aIdx: number) => (
                        <span key={aIdx} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-medium">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Restaurant Details Card */}
        {place.type === 'restaurant' && (place as any).restaurants && (place as any).restaurants.length > 0 && (
          <GlassCard hoverEffect={false}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">Restaurant Specifications</h3>
            <div className="flex flex-col gap-2.5 text-xs">
              {(place as any).restaurants.map((r: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1.5 pb-2 last:pb-0 border-b last:border-b-0 border-slate-200/50 dark:border-slate-800/50 font-sans">
                  <div className="flex justify-between items-center font-bold">
                    <span>{r.name}</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">{r.priceRange}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Cuisine: <span className="font-semibold text-slate-600 dark:text-slate-200">{r.cuisine}</span></p>
                  {r.specialties && r.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.specialties.map((s: string, sIdx: number) => (
                        <span key={sIdx} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* History Section */}
        {place.history && (
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
              <BookOpen className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Historical Context</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {place.history}
            </p>
          </GlassCard>
        )}

        {/* Route Details & Leaflet Map */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation Route</h3>
          <LeafletMap 
            center={userCoords} 
            routeTo={placeCoords}
            markers={[{ lat: placeCoords[0], lon: placeCoords[1], popupText: place.name, type: (['hotel', 'restaurant', 'landmark'].includes(place.type) ? place.type : 'other') as any }]}
            height="200px"
          />
        </div>

        {/* Nearby Transport details */}
        <GlassCard hoverEffect={false}>
          <div className="flex items-center gap-2 mb-2.5 text-blue-500">
            <Train className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Nearby Transit</h3>
          </div>
          <div className="flex flex-col gap-2">
            {place.transportRules?.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span>{rule}</span>
              </div>
            )) || (
              <p className="text-xs text-slate-400 italic">No direct transit stops registered nearby. Walking or taxis are recommended.</p>
            )}
          </div>
        </GlassCard>

        {/* Local Rules / Restrictions */}
        <GlassCard hoverEffect={false} className="border border-red-500/10 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2.5 text-red-500">
            <ShieldAlert className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Site Rules & Restrictions</h3>
          </div>
          <div className="flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <span>Large luggage items are generally prohibited; security checks are enforced at entrance corridors.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <span>Keep noise levels low. Respect signs and cordoned areas at all times.</span>
            </div>
          </div>
        </GlassCard>

        {/* Emergency Hotline Services */}
        {destination?.emergency && (
          <GlassCard hoverEffect={false} className="border border-red-500/20 bg-red-500/5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-500 mb-3">Emergency Services</h3>
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
          </GlassCard>
        )}

        {/* Nearby Recommendations */}
        {nearbyPlaces.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Discover Nearby Sights</h3>
            <div className="flex flex-col gap-2">
              {nearbyPlaces.map((np) => (
                <div
                  key={np.id}
                  onClick={() => navigate(`/place/${np.id}`)}
                  className="flex items-center gap-3.5 bg-white dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800/55 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2.5 rounded-2xl cursor-pointer hover:scale-[1.01] active:scale-95 transition-all shadow-sm"
                >
                  <img
                    src={np.imageUrl}
                    alt={np.name}
                    className="w-12 h-12 object-cover rounded-xl shadow-sm"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold truncate">{np.name}</h4>
                    <p className="text-[9px] text-slate-400 capitalize mt-0.5">{np.type}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    <span className="text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                      ★ {np.rating}
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
