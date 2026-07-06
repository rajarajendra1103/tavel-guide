import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, Calendar, CheckSquare, Square, 
  Heart, Compass, BarChart2, Download, FolderOpen
} from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { useTripStore } from '../store/useTripStore';
import type { SavedTrip } from '../store/useTripStore';
import type { PackingListCategory } from '../services/gemini';
import { listDownloadedGuides, deleteDownloadedGuide } from '../services/offline';

export const SavedTripsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { savedTrips, deleteTrip, updateTripPackingList, favorites, toggleFavorite, scrapedDestinations } = useTripStore();
  
  const [activeTab, setActiveTab] = useState<'trips' | 'favs' | 'offline'>('trips');
  const [selectedTrip, setSelectedTrip] = useState<SavedTrip | null>(null);
  const [downloadedGuides, setDownloadedGuides] = useState<string[]>([]);
  
  const currencySym = selectedTrip?.plan?.currencySymbol || '$';

  // Load offline guides list
  const refreshDownloads = async () => {
    const downloads = await listDownloadedGuides();
    setDownloadedGuides(downloads);
  };

  useEffect(() => {
    refreshDownloads();
  }, []);

  // Toggle item checkmark inside packing list
  const handleTogglePackingItem = (
    tripId: string, 
    catIndex: number, 
    itemIndex: number
  ) => {
    if (!selectedTrip) return;

    const listCopy: PackingListCategory[] = JSON.parse(JSON.stringify(selectedTrip.packingList));
    const targetItem = listCopy[catIndex].items[itemIndex];
    targetItem.checked = !targetItem.checked;

    // Update locally
    const updatedTrip = { ...selectedTrip, packingList: listCopy };
    setSelectedTrip(updatedTrip);

    // Sync globally in Zustand store (writes to localStorage)
    updateTripPackingList(tripId, listCopy);
  };

  // Calculate overall packing progress
  const getPackingProgress = (trip: SavedTrip) => {
    let totalItems = 0;
    let checkedItems = 0;

    trip.packingList.forEach((cat) => {
      cat.items.forEach((item) => {
        totalItems++;
        if (item.checked) checkedItems++;
      });
    });

    return {
      total: totalItems,
      packed: checkedItems,
      percent: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0
    };
  };

  const handleSelectTrip = (trip: SavedTrip) => {
    setSelectedTrip(trip);
  };

  const handleDeleteTripClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this trip itinerary?')) {
      deleteTrip(id);
      if (selectedTrip?.id === id) {
        setSelectedTrip(null);
      }
    }
  };

  const handleDeleteGuideClick = async (e: React.MouseEvent, destId: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete downloaded guide for ${destId}?`)) {
      const success = await deleteDownloadedGuide(destId);
      if (success) {
        refreshDownloads();
      }
    }
  };

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

      {/* Header */}
      <div className="px-6 pt-4 pb-4 flex justify-between items-center max-w-md mx-auto">
        <div>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Your Offline Workspace</span>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0">Saved Travel Hub</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 flex flex-col gap-5">
        
        {/* Toggle between Saved Trips, Bookmarks, and Offline Guides */}
        {!selectedTrip && (
          <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/20 dark:border-slate-800/10">
            <button
              onClick={() => setActiveTab('trips')}
              className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === 'trips' ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              Trips ({savedTrips.length})
            </button>
            <button
              onClick={() => setActiveTab('favs')}
              className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === 'favs' ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              Bookmarks ({favorites.length})
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === 'offline' ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              Guides ({downloadedGuides.length})
            </button>
          </div>
        )}

        {/* Tab 1: Saved Trips */}
        {activeTab === 'trips' && !selectedTrip && (
          <div className="flex flex-col gap-3 animate-slide-up">
            {savedTrips.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2.5 animate-pulse-soft" />
                <p className="font-bold">No saved trips found</p>
                <p className="text-[10px] text-slate-400 mt-1">Go to the search screen or select a destination, then use the AI Planner to build one!</p>
              </div>
            ) : (
              savedTrips.map((trip) => {
                const prog = getPackingProgress(trip);
                return (
                  <GlassCard
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip)}
                    className="flex flex-col gap-3.5 py-4 px-4 border border-slate-200/40 dark:border-slate-800/40 relative cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold leading-tight">{trip.destination}</h4>
                        <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar size={10} /> {trip.startDate} to {trip.endDate} ({trip.duration} days)
                        </p>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteTripClick(e, trip.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Progress Checklist Bar */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                        <span>Items Packed</span>
                        <span>{prog.packed} / {prog.total} ({prog.percent}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${prog.percent}%` }}
                        />
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Bookmarked Favorites */}
        {activeTab === 'favs' && !selectedTrip && (
          <div className="flex flex-col gap-2.5 animate-slide-up">
            {favorites.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
                <p className="font-bold">No bookmarks saved yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Tap the heart icon on any attraction page to add it to your travel list.</p>
              </div>
            ) : (
              favorites.map((place) => (
                <GlassCard
                  key={place.id}
                  onClick={() => navigate(`/place/${place.id}`)}
                  className="flex gap-3 py-3 px-3 relative"
                >
                  <img 
                    src={place.imageUrl} 
                    alt={place.name} 
                    className="w-14 h-14 object-cover rounded-xl shadow-sm"
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-xs font-bold truncate">{place.name}</h4>
                      <p className="text-[9px] text-slate-400 capitalize mt-0.5">{place.type}</p>
                    </div>
                    <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold w-fit mt-1">
                      ★ {place.rating}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(place); }}
                    className="p-1.5 bg-red-500/10 text-red-500 rounded-lg self-center"
                  >
                    <Heart size={14} className="fill-red-500" />
                  </button>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Offline Destination Guides */}
        {activeTab === 'offline' && !selectedTrip && (
          <div className="flex flex-col gap-2.5 animate-slide-up">
            {downloadedGuides.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 font-sans">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
                <p className="font-bold">No offline guides downloaded</p>
                <p className="text-[10px] text-slate-400 mt-1">Search for destinations and tap the download icon to save them for offline use.</p>
              </div>
            ) : (
              downloadedGuides.map((guideId) => {
                // Find name from cache or format guideId
                const cached = scrapedDestinations.find((d: any) => d.id === guideId);
                const guideName = cached?.name || guideId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const guideCountry = cached?.country || 'Saved Destination';

                return (
                  <GlassCard
                    key={guideId}
                    onClick={() => navigate(`/discovery/${guideId}`)}
                    className="flex justify-between items-center py-3.5 px-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 flex items-center justify-center">
                        <Download size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold leading-tight capitalize">{guideName}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">{guideCountry} • Offline File</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDeleteGuideClick(e, guideId)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                        title="Delete guide file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        )}

        {/* Detailed Single Trip View */}
        {selectedTrip && (
          <div className="flex flex-col gap-6 animate-slide-up">
            
            {/* Go back backlink */}
            <button
              onClick={() => setSelectedTrip(null)}
              className="text-[10px] text-green-500 hover:text-green-600 font-bold flex items-center gap-1 cursor-pointer"
            >
              ← Back to saved lists
            </button>

            {/* Destination summary card */}
            <GlassCard hoverEffect={false} className="relative h-[110px] p-0 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80" 
                alt={selectedTrip.destination}
                className="w-full h-full object-cover filter brightness-75"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-4 left-4 right-4 text-white flex justify-between items-end">
                <div>
                  <h3 className="text-lg font-bold">{selectedTrip.plan.destination}</h3>
                  <p className="text-[10px] text-slate-200">{selectedTrip.startDate} to {selectedTrip.endDate} • {selectedTrip.duration} Days</p>
                </div>
                <button 
                  onClick={(e) => handleDeleteTripClick(e, selectedTrip.id)}
                  className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </GlassCard>

            {/* Budget summaries */}
            <GlassCard hoverEffect={false}>
              <div className="flex items-center gap-2 mb-3.5 text-green-600 dark:text-green-400">
                <BarChart2 className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Itinerary Budget Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Lodging:</span>
                  <span className="font-bold">{currencySym}{selectedTrip.plan.budgetSummary.accommodation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Meals:</span>
                  <span className="font-bold">{currencySym}{selectedTrip.plan.budgetSummary.food}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Transit:</span>
                  <span className="font-bold">{currencySym}{selectedTrip.plan.budgetSummary.transport}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Tickets:</span>
                  <span className="font-bold">{currencySym}{selectedTrip.plan.budgetSummary.tickets}</span>
                </div>
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-500">Total Projection:</span>
                <span className="font-extrabold text-green-600 dark:text-green-400">{currencySym}{selectedTrip.plan.budgetSummary.total}</span>
              </div>
            </GlassCard>

            {/* Interactive Smart Packing checklist */}
            <GlassCard hoverEffect={false}>
              <div className="flex items-center gap-2 mb-4 text-green-600 dark:text-green-400">
                <CheckSquare className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Smart Packing List</h3>
              </div>

              <div className="flex flex-col gap-5">
                {selectedTrip.packingList.map((cat, catIdx) => (
                  <div key={catIdx} className="flex flex-col gap-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{cat.category}</h4>
                    <div className="flex flex-col gap-1.5 pl-1">
                      {cat.items.map((item, itemIdx) => (
                        <div 
                          key={itemIdx}
                          onClick={() => handleTogglePackingItem(selectedTrip.id, catIdx, itemIdx)}
                          className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none py-1 hover:text-slate-800"
                        >
                          {item.checked ? (
                            <CheckSquare size={16} className="text-green-500 shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={item.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Day Wise Itinerary */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Day-by-Day Schedule</h3>
              {selectedTrip.plan.itinerary.map((day) => (
                <div key={day.day} className="flex flex-col gap-2">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mt-1">Day {day.day}</h4>
                  
                  <div className="flex flex-col gap-2 pl-3 border-l-2 border-green-500/30">
                    {day.places.map((place, idx) => (
                      <GlassCard key={idx} hoverEffect={false} className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{place.timeSlot}</span>
                            <h5 className="text-xs font-bold mt-1">{place.name}</h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-sans">{place.description}</p>
                          </div>
                          <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{currencySym}{place.estimatedCost}</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center text-[9px] text-slate-400">
                          <span>Transit: {place.transportSuggestion}</span>
                          <span className="capitalize text-green-600 dark:text-green-400 font-bold">{place.type}</span>
                        </div>
                      </GlassCard>
                    ))}
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
