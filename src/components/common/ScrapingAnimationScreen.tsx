import React, { useState, useEffect } from 'react';
import { Compass, AlertTriangle, Globe } from 'lucide-react';

interface ScrapingAnimationScreenProps {
  query: string;
  isActive: boolean;
}

export const ScrapingAnimationScreen: React.FC<ScrapingAnimationScreenProps> = ({ query, isActive }) => {
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);

  const cleanQuery = query.trim() || "Destination";
  const queryLower = cleanQuery.toLowerCase().replace(/\s+/g, '-');

  const scrapingUrls = [
    `https://www.tourism-authority.${queryLower}.gov`,
    `https://www.lonelyplanet.com/travel/${queryLower}`,
    `https://www.tripadvisor.com/Search?q=${encodeURIComponent(cleanQuery)}`,
    `https://en.wikivoyage.org/wiki/${queryLower}`,
    `https://${queryLower}-city-transit.org/timetable-map`,
    `https://www.local-travel-blog.com/posts/how-to-visit-${queryLower}`,
    `https://www.world-transit-guide.net/asia/${queryLower}-routes`,
    `https://api.open-meteo.com/v1/forecast?city=${queryLower}`
  ];

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setCurrentUrlIndex((prev) => (prev + 1) % scrapingUrls.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isActive, scrapingUrls.length]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col justify-between items-center text-white py-12 px-6 text-center select-none animate-fade-in max-w-md mx-auto border-x border-slate-800">
      {/* Top Header Logo */}
      <div className="flex items-center gap-2 mt-4 opacity-80">
        <Compass className="w-6 h-6 text-green-400 animate-spin-slow" />
        <span className="font-sans text-sm font-extrabold tracking-widest bg-linear-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
          TRAVEL GUIDE
        </span>
      </div>

      {/* Radar Scanner Core Animation */}
      <div className="flex flex-col items-center gap-6 my-auto">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full border border-green-500/20 animate-ping-slow" />
          <div className="absolute w-32 h-32 rounded-full border border-green-500/30 animate-ping-slow delay-700" />
          <div className="absolute w-20 h-20 rounded-full border border-green-500/40 animate-ping-slow delay-1400" />
          
          {/* Outer circle with rotating radar sweep line */}
          <div className="absolute inset-0 rounded-full border-2 border-green-500/30 flex items-center justify-center">
            <div className="absolute top-0 bottom-1/2 left-1/2 right-1/2 w-[2px] bg-linear-to-t from-green-400 to-transparent origin-bottom animate-radar-scan" />
          </div>

          {/* Center target icon */}
          <div className="relative w-12 h-12 rounded-full bg-green-500/10 border border-green-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            <Globe className="w-6 h-6 text-green-400 animate-pulse-soft" />
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex flex-col gap-2 max-w-xs">
          <h3 className="text-lg font-bold tracking-tight text-white animate-pulse">
            Scraping travel info...
          </h3>
          <p className="text-xs text-slate-300 leading-normal">
            Querying public transit directories and official guides for <span className="text-green-400 font-extrabold">{cleanQuery}</span>.
          </p>
        </div>

        {/* The active website url output */}
        <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-slate-400 max-w-[280px] truncate shadow-inner flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping shrink-0" />
          <span>{scrapingUrls[currentUrlIndex]}</span>
        </div>
      </div>

      {/* Disclaimer Bottom Notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-2xl flex items-center gap-3 text-xs max-w-sm mx-auto mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-left leading-normal font-sans">
          AI can make mistakes. Please cross-reference important schedules and ticket prices.
        </p>
      </div>
    </div>
  );
};
