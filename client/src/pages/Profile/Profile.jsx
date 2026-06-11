import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import useAuth from '../../hooks/useAuth';
import { fetchLeaderboard, signOut } from '../../services/supabase';
import './Profile.css';

export default function Profile() {
  const { user, loading, isConfigured } = useAuth();

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  const myRank = user
    ? leaderboard.findIndex((r) => r.user_id === user.id) + 1
    : null;
  const myStats = user ? leaderboard.find((r) => r.user_id === user.id) : null;

  if (loading) return <div className="page-container"><div className="skeleton-line" style={{ height: 100 }} /></div>;

  return (
    <div className="page-container profile-page">
      <h1 className="page-title">Profile</h1>

      {!isConfigured && (
        <div className="glass-card config-notice">
          <p>Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable accounts.</p>
        </div>
      )}

      {user ? (
        <div className="profile-card glass-card">
          <div className="avatar">👤</div>
          <h2>{user.user_metadata?.display_name || user.email}</h2>
          <p className="email">{user.email}</p>

          {myStats && (
            <div className="profile-stats">
              <div><strong>{myStats.total_points}</strong><span>Points</span></div>
              <div><strong>#{myRank || '—'}</strong><span>Rank</span></div>
              <div><strong>{myStats.predictions_count}</strong><span>Predictions</span></div>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => signOut()}>Sign Out</button>
        </div>
      ) : (
        <div className="profile-card glass-card">
          <p>Sign in to save predictions, simulations, and game scores.</p>
          <Link to="/auth" className="btn btn-primary">Sign In / Sign Up</Link>
        </div>
      )}

      <div className="quick-stats glass-card">
        <h3>Your Activity</h3>
        <ul>
          <li>📅 Cheered matches saved locally</li>
          <li>🎯 Predictions sync when signed in</li>
          <li>🏆 Simulations saved to cloud</li>
          <li>🎮 Game scores on leaderboard</li>
        </ul>
      </div>
    </div>
  );
}
