import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import MatchSchedule from './pages/Schedule/MatchSchedule';
import MatchDetail from './pages/Match/MatchDetail';
import TeamDetail from './pages/Team/TeamDetail';
import Predictions from './pages/Predictions/Predictions';
import Simulator from './pages/Simulator/Simulator';
import GamesHub from './pages/Games/GamesHub';
import PerfectRun from './pages/Games/PerfectRun';
import WorldCupBingo from './pages/Games/WorldCupBingo';
import KnockoutStreak from './pages/Games/KnockoutStreak';
import BracketBattle from './pages/Games/BracketBattle';
import Watch from './pages/Watch/Watch';
import Profile from './pages/Profile/Profile';
import Auth from './pages/Auth/Auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 2, staleTime: 60_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
      </BrowserRouter>
    </QueryClientProvider>
  );
}
