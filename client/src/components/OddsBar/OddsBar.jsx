import './OddsBar.css';

export default function OddsBar({ odds, compact = false }) {
  if (!odds?.probabilities) return null;

  const { home, draw, away } = odds.probabilities;
  const total = home + draw + away;
  const hPct = (home / total) * 100;
  const dPct = (draw / total) * 100;
  const aPct = (away / total) * 100;

  return (
    <div className={`odds-bar-wrapper ${compact ? 'compact' : ''}`}>
      <div className="odds-bar">
        <div className="odds-segment home" style={{ width: `${hPct}%` }}>
          <span>{odds.homeCode}</span>
          <span>{odds.odds?.home?.toFixed(2)}</span>
        </div>
        <div className="odds-segment draw" style={{ width: `${dPct}%` }}>
          <span>X</span>
          <span>{odds.odds?.draw?.toFixed(2)}</span>
        </div>
        <div className="odds-segment away" style={{ width: `${aPct}%` }}>
          <span>{odds.awayCode}</span>
          <span>{odds.odds?.away?.toFixed(2)}</span>
        </div>
      </div>
      {!compact && (
        <div className="odds-labels">
          <span>Home {(home * 100).toFixed(0)}%</span>
          <span>Draw {(draw * 100).toFixed(0)}%</span>
          <span>Away {(away * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
