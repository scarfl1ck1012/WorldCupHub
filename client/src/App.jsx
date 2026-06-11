import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/Layout/AppLayout';

// Lazy load routes for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const MatchSchedule = lazy(() => import('./pages/Schedule/MatchSchedule'));
const MatchDetail = lazy(() => import('./pages/Match/MatchDetail'));
const TeamDetail = lazy(() => import('./pages/Team/TeamDetail'));
const Predictions = lazy(() => import('./pages/Predictions/Predictions'));
const Simulator = lazy(() => import('./pages/Simulator/Simulator'));
const GamesHub = lazy(() => import('./pages/Games/GamesHub'));
const PerfectRun = lazy(() => import('./pages/Games/PerfectRun'));
const WorldCupBingo = lazy(() => import('./pages/Games/WorldCupBingo'));
const KnockoutStreak = lazy(() => import('./pages/Games/KnockoutStreak'));
const BracketBattle = lazy(() => import('./pages/Games/BracketBattle'));
const Watch = lazy(() => import('./pages/Watch/Watch'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Auth = lazy(() => import('./pages/Auth/Auth'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 2, staleTime: 60_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="page-container"><div className="skeleton-line" style={{height: '100dvh', borderRadius: 'var(--radius-lg)'}} /></div>}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<MatchSchedule />} />
              <Route path="/match/:matchId" element={<MatchDetail />} />
              <Route path="/team/:teamCode" element={<TeamDetail />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/games" element={<GamesHub />} />
              <Route path="/games/perfect-run" element={<PerfectRun />} />
              <Route path="/games/bingo" element={<WorldCupBingo />} />
              <Route path="/games/streak" element={<KnockoutStreak />} />
              <Route path="/games/bracket-battle" element={<BracketBattle />} />
              <Route path="/watch" element={<Watch />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
