import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, Sparkles, Calendar, DollarSign, 
  MapPin, Plus, Minus, Check, Loader2, Compass
} from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { generateTripPlan, generatePackingList } from '../services/gemini';
import type { TripPlanResult } from '../services/gemini';
import { useTripStore } from '../store/useTripStore';
import type { SavedTrip } from '../store/useTripStore';

export const AiPlannerScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destParam = searchParams.get('dest') || 'Paris';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  // Trip details state
  const [destination, setDestination] = useState(destParam);
  const [duration, setDuration] = useState(3);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [budget, setBudget] = useState<'budget' | 'medium' | 'luxury'>('medium');
  const [groupType, setGroupType] = useState('Solo');
  const [interests, setInterests] = useState<string[]>(['Culture']);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<TripPlanResult | null>(null);

  const { addTrip } = useTripStore();
  const currencySym = generatedPlan?.currencySymbol || '$';

  const groupOptions = ['Solo', 'Couple', 'Family', 'Friends', 'Custom'];
  const interestOptions = ['Adventure', 'Nature', 'Food', 'Culture', 'Shopping', 'History', 'Beaches', 'Nightlife'];

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  // Trigger AI Trip Plan and Packing List generation
  const handleGeneratePlan = async () => {
    setLoading(true);
    setLoadingMsg('Consulting travel database...');
    
    // Cycle messages for premium UX
    const loaderIntervals = [
      { t: 1500, m: 'Drafting hourly schedules...' },
      { t: 3000, m: 'Customizing transit routing...' },
      { t: 4500, m: 'Sourcing highly-rated restaurants...' },
      { t: 6000, m: 'Compiling final budgeting summaries...' }
    ];
    loaderIntervals.forEach((item) => {
      setTimeout(() => {
        setLoadingMsg(item.m);
      }, item.t);
    });

    try {
      // 1. Generate core Itinerary
      const plan = await generateTripPlan(
        destination,
        budget,
        duration,
        startDate,
        groupType,
        interests,
        specialRequirements
      );

      // 2. Generate customized Packing Checklist
      const weatherEstimate = 'Mild, mostly clear skies';
      const seasonEstimate = 'Summer';
      const packing = await generatePackingList(
        destination,
        weatherEstimate,
        duration,
        seasonEstimate,
        interests
      );

      setGeneratedPlan(plan);
      
      // Auto save trip details to offline store
      const newTrip: SavedTrip = {
        id: `trip_${Date.now()}`,
        destination: plan.destination,
        startDate,
        endDate: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + duration)).toISOString().split('T')[0],
        duration,
        budgetType: budget,
        groupType,
        interests,
        specialRequirements,
        plan,
        packingList: packing,
        createdAt: new Date().toISOString()
      };

      addTrip(newTrip);
      setStep(4); // View results screen
    } catch (err) {
      console.error('Plan generation error:', err);
    } finally {
      setLoading(false);
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

      {/* Top Header */}
      <div className="px-6 pt-4 pb-4 flex items-center gap-3.5 max-w-md mx-auto">
        <button 
          onClick={() => step === 4 ? navigate('/saved') : navigate(-1)}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all text-slate-700 dark:text-slate-300"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">AI Trip Planner</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Step {step} of 3</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 mt-4">
        
        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest mt-4 text-green-300 animate-pulse">{loadingMsg}</p>
          </div>
        )}

        {/* Step 1: Base Config */}
        {step === 1 && (
          <div className="flex flex-col gap-5 animate-slide-up">
            
            <GlassCard hoverEffect={false}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-4">Trip Destination</h3>
              <div className="relative mb-2">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Paris, Tokyo, Rome..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </GlassCard>

            <GlassCard hoverEffect={false}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Duration (Days)</h3>
                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/50 dark:border-slate-800/50">
                  <button 
                    onClick={() => setDuration(Math.max(1, duration - 1))}
                    className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer shadow-sm"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{duration}</span>
                  <button 
                    onClick={() => setDuration(Math.min(14, duration + 1))}
                    className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverEffect={false}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-4">Budget Range</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {(['budget', 'medium', 'luxury'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`py-3 text-xs font-bold rounded-xl capitalize cursor-pointer transition-all border ${
                      budget === b
                        ? 'bg-green-500 text-white border-green-500 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign size={14} className="inline mr-0.5 -mt-0.5" />
                    <span>{b === 'medium' ? 'Standard' : b}</span>
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard hoverEffect={false}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-4">Travel Companions</h3>
              <div className="grid grid-cols-3 gap-2">
                {groupOptions.slice(0, 3).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupType(g)}
                    className={`py-2 text-xs font-bold rounded-xl cursor-pointer transition-all border ${
                      groupType === g
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {groupOptions.slice(3).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupType(g)}
                    className={`py-2 text-xs font-bold rounded-xl cursor-pointer transition-all border ${
                      groupType === g
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </GlassCard>

            <button
              onClick={nextStep}
              className="w-full bg-green-500 text-white font-bold py-3.5 rounded-xl mt-4 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-md"
            >
              Continue to Interests
            </button>

          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="flex flex-col gap-5 animate-slide-up">
            
            <GlassCard hoverEffect={false}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Travel Interests</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">Choose one or more areas of interest</p>
              
              <div className="grid grid-cols-2 gap-2.5">
                {interestOptions.map((opt) => {
                  const isChosen = interests.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleInterest(opt)}
                      className={`py-3 px-4 text-xs font-bold rounded-xl text-left cursor-pointer transition-all border flex justify-between items-center ${
                        isChosen
                          ? 'bg-green-500/10 dark:bg-green-500/15 border-green-500/50 text-green-600 dark:text-green-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt}</span>
                      {isChosen && <Check size={14} className="text-green-600 dark:text-green-400 font-bold" />}
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            <div className="flex gap-3.5 mt-4">
              <button
                onClick={prevStep}
                className="flex-1 py-3.5 bg-slate-200 dark:bg-slate-800 font-bold rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-3.5 bg-green-500 text-white font-bold rounded-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-md"
              >
                Next Step
              </button>
            </div>

          </div>
        )}

        {/* Step 3: Special Requirements */}
        {step === 3 && (
          <div className="flex flex-col gap-5 animate-slide-up">
            
            <GlassCard hoverEffect={false}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Special Requirements</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">(Optional) Diet, medical, kids or elderly constraints</p>
              
              <textarea
                placeholder="E.g. Vegetarian diet, wheelchair access required, traveling with toddler..."
                rows={5}
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </GlassCard>

            <div className="flex gap-3.5 mt-4">
              <button
                onClick={prevStep}
                className="flex-1 py-3.5 bg-slate-200 dark:bg-slate-800 font-bold rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleGeneratePlan}
                className="flex-1 py-3.5 bg-linear-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
              >
                <Sparkles size={16} />
                <span>Generate Plan</span>
              </button>
            </div>

          </div>
        )}

        {/* Step 4: Show Final Trip Itinerary Display */}
        {step === 4 && generatedPlan && (
          <div className="flex flex-col gap-6 animate-slide-up">
            
            {/* Header Success info */}
            <div className="bg-green-500/10 border border-green-500/25 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                <Check size={20} className="font-extrabold" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Trip Generated & Saved!</h3>
                <p className="text-[10px] text-slate-400">Offline itinerary and packing lists are synced.</p>
              </div>
            </div>

            {/* Destination Cover Summary */}
            <GlassCard hoverEffect={false} className="relative h-[120px] overflow-hidden p-0 rounded-2xl">
              <img 
                src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80" 
                alt={destination}
                className="w-full h-full object-cover filter brightness-75"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-lg font-bold">{generatedPlan.destination}</h3>
                <p className="text-xs text-slate-200">{duration} Days • {groupType} • {budget.toUpperCase()}</p>
              </div>
            </GlassCard>

            {/* Budget summary */}
            <GlassCard hoverEffect={false}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-3">Estimated Budget Projection</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Accommodation:</span>
                  <span className="font-bold">{currencySym}{generatedPlan.budgetSummary.accommodation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Food & Dining:</span>
                  <span className="font-bold">{currencySym}{generatedPlan.budgetSummary.food}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Transit:</span>
                  <span className="font-bold">{currencySym}{generatedPlan.budgetSummary.transport}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Sights & Tickets:</span>
                  <span className="font-bold">{currencySym}{generatedPlan.budgetSummary.tickets}</span>
                </div>
              </div>
              <div className="flex justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-sm">
                <span className="font-bold text-slate-600 dark:text-slate-400">Estimated Total Cost:</span>
                <span className="font-extrabold text-green-600 dark:text-green-400">{currencySym}{generatedPlan.budgetSummary.total}</span>
              </div>
            </GlassCard>

            {/* Day Wise Itinerary List */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Day-by-Day Schedule</h3>
              {generatedPlan.itinerary.map((day) => (
                <div key={day.day} className="flex flex-col gap-2">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mt-2">Day {day.day}</h4>
                  
                  {/* Day Itinerary places cards */}
                  <div className="flex flex-col gap-2 relative pl-3 border-l-2 border-green-500/30">
                    {day.places.map((place, idx) => (
                      <GlassCard key={idx} hoverEffect={false} className="p-3.5 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{place.timeSlot}</span>
                            <h5 className="text-xs font-bold mt-1.5">{place.name}</h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-sans">{place.description}</p>
                          </div>
                          <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{currencySym}{place.estimatedCost}</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center text-[9px] text-slate-400 font-semibold">
                          <span>Transit: {place.transportSuggestion}</span>
                          <span className="capitalize text-green-600 dark:text-green-400">{place.type}</span>
                        </div>
                      </GlassCard>
                    ))}
                  </div>

                  {/* Dining suggestions */}
                  <div className="bg-white/60 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 text-xs mt-1 pl-6">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Eats Suggestions:</p>
                    <ul className="list-disc list-inside text-[10px] text-slate-600 dark:text-slate-300 mt-1 flex flex-col gap-0.5">
                      {day.restaurantSuggestions.map((rest, rIdx) => <li key={rIdx}>{rest}</li>)}
                    </ul>
                  </div>

                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/saved')}
              className="w-full bg-green-500 text-white font-bold py-3.5 rounded-xl cursor-pointer text-center text-sm shadow-md"
            >
              View Saved Trips & Packing Checklists
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
