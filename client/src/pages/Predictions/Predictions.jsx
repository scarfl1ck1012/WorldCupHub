import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchMatches, fetchOdds } from '../../services/api';
import { upsertPrediction, fetchUserPredictions, fetchLeaderboard } from '../../services/supabase';
import useAuth from '../../hooks/useAuth';
import { getFlag, getTeamLabel } from '../../utils/flags';
import OddsBar from '../../components/OddsBar/OddsBar';
import './Predictions.css';

export default function Predictions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [picks, setPicks] = useState({});
  const [scores, setScores] = useState({});

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', '2026'],
    queryFn: () => fetchMatches({ year: '2026', stage: 'group' }),
  });

  const { data: odds = [] } = useQuery({
    queryKey: ['odds'],
    queryFn: fetchOdds,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    enabled: true,
  });

  useEffect(() => {
    if (!user) return;
    fetchUserPredictions(user.id).then((preds) => {
      const p = {};
      const s = {};
      preds.forEach((pr) => {
        p[pr.match_id] = pr.pick;
        s[pr.match_id] = { home: pr.score_home, away: pr.score_away };
      });
      setPicks(p);
      setScores(s);
    });
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: ({ matchId, pick, scoreHome, scoreAway }) =>
      upsertPrediction(user.id, matchId, pick, scoreHome, scoreAway),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
  });

  const oddsMap = Object.fromEntries(odds.map((o) => [o.matchId, o]));
  const schedulable = matches.filter((m) => m.homeCode !== 'TBD');

  const handlePick = (matchId, pick) => {
    setPicks((prev) => ({ ...prev, [matchId]: pick }));
    if (user) {
      const sc = scores[matchId] || {};
      saveMutation.mutate({ matchId, pick, scoreHome: sc.home, scoreAway: sc.away });
    }
  };

  const handleScore = (matchId, side, value) => {
    const updated = {
      ...scores,
      [matchId]: { ...scores[matchId], [side]: parseInt(value, 10) || 0 },
    };
    setScores(updated);
  };

  const saveScore = (matchId) => {
    if (!user || !picks[matchId]) return;
    const sc = scores[matchId] || {};
    saveMutation.mutate({
      matchId,
      pick: picks[matchId],
      scoreHome: sc.home,
      scoreAway: sc.away,
    });
  };

  return (
    <div className="page-container predictions-page">
      <h1 className="page-title">Predictions</h1>
      <p className="page-subtitle">Pick results and scores — 3 pts exact, 1 pt correct outcome</p>

      {!user && (
        <div className="auth-prompt glass-card">
          <p><Link to="/auth">Sign in</Link> to save predictions and join the leaderboard.</p>
        </div>
      )}

      <div className="leaderboard glass-card">
        <h3>🏆 Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="empty">No predictions yet. Be the first!</p>
        ) : (
          <table className="lb-table">
            <thead>
              <tr><th>#</th><th>Player</th><th>Pts</th><th>Picks</th></tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 10).map((row, i) => (
                <tr key={row.user_id}>
                  <td>{i + 1}</td>
                  <td>{row.display_name || 'Anonymous'}</td>
                  <td>{row.total_points}</td>
                  <td>{row.predictions_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="section-title">Group Stage Picks</h2>
      {schedulable.map((m) => {
        const o = oddsMap[m.id];
        return (
          <div key={m.id} className="prediction-card glass-card">
            <div className="pred-teams">
              <span>{getFlag(m.homeCode)} {getTeamLabel(m.homeCode)}</span>
              <span>vs</span>
              <span>{getTeamLabel(m.awayCode)} {getFlag(m.awayCode)}</span>
            </div>
            {o && <OddsBar odds={o} compact />}
            <div className="pick-buttons">
              {['home', 'draw', 'away'].map((p) => (
                <button
                  key={p}
                  className={`pick-btn ${picks[m.id] === p ? 'active' : ''}`}
                  onClick={() => handlePick(m.id, p)}
                >
                  {p === 'home' ? '1' : p === 'draw' ? 'X' : '2'}
                  {o && <small>{o.odds?.[p]?.toFixed(2)}</small>}
                </button>
              ))}
            </div>
            <div className="score-inputs">
              <input
                type="number"
                min="0"
                max="9"
                placeholder="H"
                value={scores[m.id]?.home ?? ''}
                onChange={(e) => handleScore(m.id, 'home', e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                min="0"
                max="9"
                placeholder="A"
                value={scores[m.id]?.away ?? ''}
                onChange={(e) => handleScore(m.id, 'away', e.target.value)}
              />
              {user && (
                <button className="btn btn-ghost" onClick={() => saveScore(m.id)}>Save</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
