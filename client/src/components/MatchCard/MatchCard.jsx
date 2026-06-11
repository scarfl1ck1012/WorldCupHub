import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { getFlag, getTeamLabel } from '../../utils/flags';
import OddsBar from '../OddsBar/OddsBar';
import './MatchCard.css';

export default function MatchCard({ match, odds, cheeredTeam, onCheer }) {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const kickoff = dayjs(match.date);

  return (
    <div className="match-card glass-card">
      <div className="match-card-header">
        <span className="match-stage">{match.group || match.stage}</span>
        {isLive && <span className="badge badge-live">Live</span>}
        {!isLive && !isFinished && <span className="badge badge-upcoming">{kickoff.format('HH:mm')}</span>}
        {isFinished && <span className="badge badge-finished">FT</span>}
      </div>

      <Link to={`/match/${match.id}`} className="match-teams">
        <div className="match-team">
          <span className="team-flag">{getFlag(match.homeCode)}</span>
          <span className="team-name">{getTeamLabel(match.homeCode)}</span>
          {isFinished && <span className="team-score">{match.homeScore}</span>}
        </div>
        <span className="match-vs">{isFinished ? '-' : 'vs'}</span>
        <div className="match-team away">
          {isFinished && <span className="team-score">{match.awayScore}</span>}
          <span className="team-name">{getTeamLabel(match.awayCode)}</span>
          <span className="team-flag">{getFlag(match.awayCode)}</span>
        </div>
      </Link>

      <div className="match-meta">
        <span>{kickoff.format('ddd, MMM D')}</span>
        {match.venue && <span> · {match.city}</span>}
      </div>

      {odds && <OddsBar odds={odds} compact />}

      {!isFinished && match.homeCode !== 'TBD' && onCheer && (
        <div className="cheer-row">
          <button
            className={`btn btn-cheer ${cheeredTeam === match.homeCode ? 'active' : ''}`}
            onClick={() => onCheer(match, match.homeCode, match.homeTeam || match.homeCode)}
            aria-label={`Cheer for ${match.homeCode}`}
          >
            👏 {getTeamLabel(match.homeCode)}
          </button>
          <button
            className={`btn btn-cheer ${cheeredTeam === match.awayCode ? 'active' : ''}`}
            onClick={() => onCheer(match, match.awayCode, match.awayTeam || match.awayCode)}
            aria-label={`Cheer for ${match.awayCode}`}
          >
            👏 {getTeamLabel(match.awayCode)}
          </button>
        </div>
      )}
    </div>
  );
}
