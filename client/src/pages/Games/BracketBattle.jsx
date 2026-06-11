import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMatches, fetchOdds } from '../../services/api';
import { getFlag, getTeamLabel } from '../../utils/flags';
import './Games.css';

export default function BracketBattle() {
  const [playerPicks, setPlayerPicks] = useState({});
  const [friendPicks, setFriendPicks] = useState({});
  const [phase, setPhase] = useState('player');
  const [score, setScore] = useState(null);

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', '2026'],
    queryFn: () => fetchMatches({ year: '2026', stage: 'group' }),
  });

  const battleMatches = matches.filter((m) => m.homeCode !== 'TBD').slice(0, 8);

  const handlePick = (matchId, pick) => {
    if (phase === 'player') {
      setPlayerPicks((prev) => ({ ...prev, [matchId]: pick }));
    } else {
      setFriendPicks((prev) => ({ ...prev, [matchId]: pick }));
    }
  };

  const compare = () => {
    let playerScore = 0;
    let friendScore = 0;
    battleMatches.forEach((m) => {
      if (playerPicks[m.id] === friendPicks[m.id]) {
        playerScore++;
        friendScore++;
      } else {
        if (Math.random() > 0.5) playerScore++;
        else friendScore++;
      }
    });
    setScore({ player: playerScore, friend: friendScore });
    setPhase('result');
  };

  const picks = phase === 'friend' ? friendPicks : playerPicks;
  const allPicked = battleMatches.every((m) => picks[m.id]);

  return (
    <div className="page-container">
      <Link to="/games" className="back-link">← All Games</Link>
      <h1 className="page-title">Bracket Battle</h1>
      <p className="page-subtitle">
        {phase === 'player' ? 'Make your picks first' : phase === 'friend' ? "Friend's turn — pass the device" : 'Results'}
      </p>

      {phase !== 'result' && (
        <>
          <div className="battle-matches">
            {battleMatches.map((m) => (
              <div key={m.id} className="prediction-card glass-card">
                <span>{getFlag(m.homeCode)} {getTeamLabel(m.homeCode)} vs {getTeamLabel(m.awayCode)} {getFlag(m.awayCode)}</span>
                <div className="pick-buttons">
                  {['home', 'draw', 'away'].map((p) => (
                    <button
                      key={p}
                      className={`pick-btn ${picks[m.id] === p ? 'active' : ''}`}
                      onClick={() => handlePick(m.id, p)}
                    >
                      {p === 'home' ? '1' : p === 'draw' ? 'X' : '2'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {allPicked && phase === 'player' && (
            <button className="btn btn-primary" onClick={() => setPhase('friend')}>Pass to Friend →</button>
          )}
          {allPicked && phase === 'friend' && (
            <button className="btn btn-primary" onClick={compare}>Compare Brackets</button>
          )}
        </>
      )}

      {phase === 'result' && score && (
        <div className="battle-result glass-card">
          <h2>Battle Results</h2>
          <div className="battle-scores">
            <div><span>You</span><strong>{score.player}</strong></div>
            <div><span>Friend</span><strong>{score.friend}</strong></div>
          </div>
          <p>{score.player > score.friend ? 'You win!' : score.friend > score.player ? 'Friend wins!' : "It's a tie!"}</p>
          <button className="btn btn-ghost" onClick={() => { setPhase('player'); setPlayerPicks({}); setFriendPicks({}); setScore(null); }}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
