import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMatches, fetchOdds } from '../../services/api';
import { saveGameScore } from '../../services/supabase';
import useAuth from '../../hooks/useAuth';
import { getFlag, getTeamLabel } from '../../utils/flags';
import './Games.css';

function getStreak() {
  try {
    return JSON.parse(localStorage.getItem('wc_streak') || '{"streak":0,"day":0,"lost":false}');
  } catch { return { streak: 0, day: 0, lost: false }; }
}

export default function KnockoutStreak() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState(getStreak);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', '2026'],
    queryFn: () => fetchMatches({ year: '2026' }),
  });

  const { data: odds = [] } = useQuery({
    queryKey: ['odds'],
    queryFn: fetchOdds,
  });

  const oddsMap = Object.fromEntries(odds.map((o) => [o.matchId, o]));
  const playable = matches.filter((m) => m.homeCode !== 'TBD').slice(0, 20);
  const dayIndex = streakData.day % playable.length;
  const todayMatch = playable[dayIndex];

  const handlePick = (pick) => {
    if (picked || !todayMatch) return;
    setPicked(pick);
    setRevealed(true);

    const o = oddsMap[todayMatch.id];
    if (!o) return;

    const probs = o.probabilities;
    const r = Math.random();
    let actual;
    if (r < probs.home) actual = 'home';
    else if (r < probs.home + probs.draw) actual = 'draw';
    else actual = 'away';

    const won = pick === actual;
    const newStreak = won
      ? { streak: streakData.streak + 1, day: streakData.day + 1, lost: false, lastResult: 'win' }
      : { streak: 0, day: streakData.day + 1, lost: true, lastResult: 'loss' };

    setStreakData(newStreak);
    localStorage.setItem('wc_streak', JSON.stringify(newStreak));
    if (user && won) saveGameScore(user.id, 'knockout-streak', newStreak.streak);
  };

  const reset = () => {
    const fresh = { streak: 0, day: 0, lost: false };
    setStreakData(fresh);
    setPicked(null);
    setRevealed(false);
    localStorage.setItem('wc_streak', JSON.stringify(fresh));
  };

  if (!todayMatch) return <div className="page-container"><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <Link to="/games" className="back-link">← All Games</Link>
      <h1 className="page-title">Knockout Streak</h1>
      <p className="page-subtitle">Pick the winner daily — how long can you survive?</p>

      <div className="streak-score glass-card">
        <span>🔥 Current Streak</span>
        <strong>{streakData.streak}</strong>
      </div>

      <div className="streak-match glass-card">
        <h3>Day {streakData.day + 1}</h3>
        <div className="streak-teams">
          <span>{getFlag(todayMatch.homeCode)} {getTeamLabel(todayMatch.homeCode)}</span>
          <span>vs</span>
          <span>{getTeamLabel(todayMatch.awayCode)} {getFlag(todayMatch.awayCode)}</span>
        </div>
        {!picked ? (
          <div className="pick-buttons">
            {['home', 'draw', 'away'].map((p) => (
              <button key={p} className="pick-btn" onClick={() => handlePick(p)}>
                {p === 'home' ? '1' : p === 'draw' ? 'X' : '2'}
              </button>
            ))}
          </div>
        ) : (
          <div className="streak-result">
            {streakData.lastResult === 'win' ? '✅ Correct! Streak continues.' : '❌ Wrong! Streak ended.'}
            <button className="btn btn-ghost" onClick={reset}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
