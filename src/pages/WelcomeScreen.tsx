import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Navigation, Globe, MapPin, Settings, Check, X } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { getBackendBaseUrl } from '../services/apiConfig';
import { GlassCard } from '../components/common/GlassCard';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const initTheme = useThemeStore((state) => state.initTheme);

  const [showSettings, setShowSettings] = useState(false);
  const [ipInput, setIpInput] = useState(localStorage.getItem('BACKEND_SERVER_IP') || '192.168.31.210');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('BACKEND_SERVER_IP', ipInput.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSettings(false);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-6 py-12 overflow-hidden bg-slate-900 text-white">
      {/* Background Image with Dark Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105 filter brightness-50 contrast-110 transition-transform duration-10000 ease-out animate-pulse-soft"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80')`
        }}
      />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/60 to-slate-950/40 z-0" />

      {/* Header section */}
      <div className="relative z-10 w-full flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Compass className="w-8 h-8 text-green-400 animate-spin-slow" />
          <span className="font-sans text-xl font-extrabold tracking-widest bg-linear-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            TRAVEL GUIDE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all cursor-pointer"
            title="Configure Server Connection"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 text-xs text-slate-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <Globe className="w-3.5 h-3.5" />
            <span>v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Welcome Title */}
      <div className="relative z-10 text-center my-auto max-w-sm flex flex-col gap-4 animate-slide-up">
        <div className="inline-flex mx-auto items-center gap-2 bg-green-500/20 backdrop-blur-md border border-green-500/30 px-4 py-1.5 rounded-full text-green-300 text-xs font-semibold tracking-wider uppercase mb-2">
          <Sparkles className="w-3.5 h-3.5 text-green-400" />
          AI-Powered Travel Guide
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-white mb-0">
          Explore The <br />
          <span className="bg-linear-to-r from-green-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            World Smarter
          </span>
        </h1>
        
        <p className="text-slate-300 text-sm leading-relaxed">
          Plan custom itineraries, explore locations offline, get transit routes, and organize packing lists with our intelligent travel assistant.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6 text-left">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl">
            <Sparkles className="w-5 h-5 text-green-400 mb-1.5" />
            <h3 className="text-xs font-bold text-white">AI Planner</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Instant custom schedules</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl">
            <Navigation className="w-5 h-5 text-blue-400 mb-1.5" />
            <h3 className="text-xs font-bold text-white">Transit Guide</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Offline routing & timetables</p>
          </div>
        </div>
      </div>

      {/* Footer / CTA section */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-4 mt-auto">
        <button
          onClick={() => navigate('/search')}
          className="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl shadow-[0_10px_25px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer text-base"
        >
          <span>Start Journey</span>
          <Navigation className="w-5 h-5 rotate-45 text-white" />
        </button>

        <p className="text-[11px] text-slate-500 text-center flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> Fast offline maps. No registration required.
        </p>
      </div>

      {/* Settings Modal overlay */}
      {showSettings && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-fade-in">
          <GlassCard className="w-full max-w-sm border border-white/15 p-6 flex flex-col gap-4 relative z-50 text-slate-100 bg-slate-900/90 shadow-2xl rounded-3xl">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-2 text-white">
                <Settings className="w-4 h-4 text-green-400" />
                Backend Server Settings
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-slate-350 leading-relaxed">
              When running on an Android device, the app must connect to your computer running the Node.js backend. Enter your computer's Wi-Fi IP address below:
            </p>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-3">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Computer IP Address / Host
                </label>
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="text-[10px] text-slate-400 flex flex-col gap-0.5 bg-black/20 p-2.5 rounded-xl border border-white/5 font-mono">
                <div className="truncate">Active Host: {getBackendBaseUrl()}</div>
                <div>Server command: npm run dev</div>
              </div>

              <button
                type="submit"
                disabled={saveSuccess}
                className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer mt-2"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white animate-bounce" />
                    <span>Saved Server Settings!</span>
                  </>
                ) : (
                  <span>Save Connection Settings</span>
                )}
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
