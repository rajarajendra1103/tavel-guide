import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { SearchScreen } from './pages/SearchScreen';
import { DiscoveryScreen } from './pages/DiscoveryScreen';
import { PlaceDetailsScreen } from './pages/PlaceDetailsScreen';
import { AiPlannerScreen } from './pages/AiPlannerScreen';
import { TransportGuideScreen } from './pages/TransportGuideScreen';
import { AssistantChatScreen } from './pages/AssistantChatScreen';
import { SavedTripsScreen } from './pages/SavedTripsScreen';
import { BottomNav } from './components/common/BottomNav';
import { useThemeStore } from './store/useThemeStore';
import { useTripStore } from './store/useTripStore';

function App() {
  const initTheme = useThemeStore((state) => state.initTheme);
  const loadFromPreferences = useTripStore((state) => state.loadFromPreferences);

  // Initialize theme and restore offline cache on app boot
  useEffect(() => {
    initTheme();
    loadFromPreferences();
  }, [initTheme, loadFromPreferences]);

  return (
    <Router>
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden border-x border-slate-200/50 dark:border-slate-800/20">
        
        {/* Render Page Routes */}
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/discovery/:id" element={<DiscoveryScreen />} />
          <Route path="/place/:id" element={<PlaceDetailsScreen />} />
          <Route path="/ai-planner" element={<AiPlannerScreen />} />
          <Route path="/transport" element={<TransportGuideScreen />} />
          <Route path="/chat" element={<AssistantChatScreen />} />
          <Route path="/saved" element={<SavedTripsScreen />} />
        </Routes>

        {/* Global Bottom Navigation bar */}
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
