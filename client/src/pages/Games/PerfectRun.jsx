import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchLegends } from '../../services/api';
import { saveGameScore } from '../../services/supabase';
import useAuth from '../../hooks/useAuth';
import { getFlag } from '../../utils/flags';
import './Games.css';
import './PerfectRun.css';

const FORMATIONS = ['4-3-3', '4-4-2', '3-5-2'];
const POSITIONS_433 = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'];

function spinLegends(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function simulateSeason(xi, difficulty) {
  let wins = 0;
  const weights = { GK: 1.4, CB: 1.2, CM: 1.1, ST: 1.0, FW: 1.0, MF: 1.1, DF: 1.2, LB: 1.0, RB: 1.0, LW: 1.0, RW: 1.0 };
  const avgRating = xi.reduce((s, p) => s + p.rating * (weights[p.position] || 1), 0) / xi.length;
  const weakness = Math.min(...xi.map((p) => p.rating));

  for (let i = 0; i < 7; i++) {
    const opponent = 75 + Math.random() * 20;
    const winChance = (avgRating - weakness * 0.3 - opponent) / 30 + 0.5;
    const roll = Math.random();
    const threshold = difficulty === 'hard' ? winChance - 0.1 : difficulty === 'easy' ? winChance + 0.15 : winChance;
    if (roll < threshold) wins++;
    else if (roll < threshold + 0.2) return { wins, draws: 1, perfect: false };
  }
  return { wins, draws: 0, perfect: wins === 7 };
}

export default function PerfectRun() {
  const { user } = useAuth();
  const [phase, setPhase] = useState('setup');
  const [difficulty, setDifficulty] = useState('normal');
  const [showRatings, setShowRatings] = useState(true);
  const [rerolls, setRerolls] = useState(1);
  const [xi, setXi] = useState([]);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [spinPool, setSpinPool] = useState([]);
  const [result, setResult] = useState(null);

  const { data: legends = [] } = useQuery({
    queryKey: ['legends'],
    queryFn: fetchLegends,
  });

  const startDraft = () => {
    setRerolls(difficulty === 'easy' ? 3 : difficulty === 'normal' ? 1 : 0);
    setXi([]);
    setCurrentSlot(0);
    setSpinPool(spinLegends(legends, 5));
    setPhase('draft');
  };

  const pickPlayer = (player) => {
    const slot = POSITIONS_433[currentSlot];
    const newXi = [...xi, { ...player, slot }];
    setXi(newXi);
    if (currentSlot >= 10) {
      setPhase('simulate');
      const sim = simulateSeason(newXi, difficulty);
      setResult(sim);
      if (user) saveGameScore(user.id, 'perfect-run', sim.wins, sim);
    } else {
      setCurrentSlot(currentSlot + 1);
      setSpinPool(spinLegends(legends, 5));
    }
  };

  const reroll = () => {
    if (rerolls <= 0) return;
    setRerolls(rerolls - 1);
    setSpinPool(spinLegends(legends, 5));
  };

  return (
    <div className="page-container perfect-run">
      <Link to="/games" className="back-link">← All Games</Link>
      <h1 className="page-title">Perfect Run</h1>
      <p className="page-subtitle">7 group wins. Zero dropped points. Draft your legends.</p>

      {phase === 'setup' && (
        <div className="setup-panel glass-card">
          <h3>Formation</h3>
          <div className="option-row">
            {FORMATIONS.map((f) => (
              <button key={f} className="tab-btn active">{f}</button>
            ))}
          </div>
          <h3>Difficulty</h3>
          <div className="option-row">
            {['easy', 'normal', 'hard'].map((d) => (
              <button
                key={d}
                className={`tab-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={showRatings} onChange={(e) => setShowRatings(e.target.checked)} />
            Show player ratings
          </label>
          <button className="btn btn-primary" onClick={startDraft}>Start Draft →</button>
        </div>
      )}

      {phase === 'draft' && (
        <div className="draft-panel">
          <div className="draft-progress">
            Pick {currentSlot + 1}/11 — <strong>{POSITIONS_433[currentSlot]}</strong>
            {rerolls > 0 && <button className="btn btn-ghost" onClick={reroll}>Reroll ({rerolls})</button>}
          </div>
          <div className="spin-grid">
            {spinPool.map((p) => (
              <button key={p.name} className="legend-card glass-card" onClick={() => pickPlayer(p)}>
                <span className="legend-flag">{getFlag(p.nation)}</span>
                <strong>{p.name}</strong>
                <span>{p.position} · {p.era}</span>
                {(showRatings || difficulty === 'easy') && <span className="legend-rating">{p.rating}</span>}
              </button>
            ))}
          </div>
          <div className="xi-so-far">
            {xi.map((p, i) => (
              <span key={i}>{POSITIONS_433[i]}: {p.name}</span>
            ))}
          </div>
        </div>
      )}

      {phase === 'simulate' && result && (
        <div className="result-panel glass-card">
          <h2>{result.perfect ? '🏆 PERFECT 7-0!' : `${result.wins}W${result.draws ? `-${result.draws}D` : ''}`}</h2>
          <p>{result.perfect ? 'Flawless group stage — legendary!' : 'So close! Try again for the perfect run.'}</p>
          <div className="xi-final">
            {xi.map((p, i) => (
              <div key={i}>{POSITIONS_433[i]}: {getFlag(p.nation)} {p.name} ({p.rating})</div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => { setPhase('setup'); setResult(null); }}>Play Again</button>
        </div>
      )}
    </div>
  );
}
