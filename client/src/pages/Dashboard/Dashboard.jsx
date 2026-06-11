import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchMatches, fetchOdds } from '../../services/api';
import useCountdown from '../../hooks/useCountdown';
import MatchCard from '../../components/MatchCard/MatchCard';
import './Dashboard.css';

export default function Dashboard() {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', '2026'],
    queryFn: () => fetchMatches({ year: '2026' }),
  });

  const { data: odds = [] } = useQuery({
    queryKey: ['odds'],
    queryFn: fetchOdds,
  });

  const upcoming = matches.filter((m) => m.status === 'scheduled');
  const nextMatch = upcoming[0];
  const countdown = useCountdown(nextMatch?.date);

  const oddsMap = Object.fromEntries(odds.map((o) => [o.matchId, o]));

  return (
    <div className="page-container dashboard">
      <div className="hero glass-card">
        <h1 className="page-title">FIFA World Cup 2026</h1>
        <p className="page-subtitle">USA · Mexico · Canada — The biggest tournament ever</p>
        {countdown && (
          <div className="countdown">
            <span className="countdown-label">Next match in</span>
            <div className="countdown-digits">
              <div><strong>{countdown.days}</strong><small>days</small></div>
              <div><strong>{countdown.hours}</strong><small>hrs</small></div>
              <div><strong>{countdown.mins}</strong><small>min</small></div>
              <div><strong>{countdown.secs}</strong><small>sec</small></div>
            </div>
          </div>
        )}
        <div className="hero-actions">
          <Link to="/schedule" className="btn btn-primary">View Schedule</Link>
          <Link to="/predictions" className="btn btn-ghost">Make Predictions</Link>
        </div>
      </div>

      <div className="quick-links">
        {[
          { to: '/simulator', icon: '🏆', label: 'Simulate WC' },
          { to: '/games', icon: '🎮', label: 'Play Games' },
          { to: '/watch', icon: '📺', label: 'Where to Watch' },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="quick-link glass-card">
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="section-title">Upcoming Matches</h2>
      {isLoading ? (
        <div className="skeleton-line" style={{ height: 80 }} />
      ) : (
        upcoming.slice(0, 5).map((m) => (
          <MatchCard key={m.id} match={m} odds={oddsMap[m.id]} />
        ))
      )}
      <Link to="/schedule" className="see-all">See all matches →</Link>
    </div>
  );
}
