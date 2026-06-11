import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMatch, fetchNews } from '../../services/api';
import { getFlag, getTeamLabel } from '../../utils/flags';
import OddsBar from '../../components/OddsBar/OddsBar';
import './MatchDetail.css';

const TABS = ['Overview', 'Stats', 'H2H', 'Form', 'Lineups', 'News'];

export default function MatchDetail() {
  const { matchId } = useParams();
  const [tab, setTab] = useState('Overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => fetchMatch(matchId),
  });

  const { data: news = [] } = useQuery({
    queryKey: ['news', data?.match?.homeCode],
    queryFn: () => fetchNews(data?.match?.homeCode),
    enabled: tab === 'News' && !!data?.match,
  });

  if (isLoading) return <div className="page-container"><div className="skeleton-line" style={{ height: 200 }} /></div>;
  if (error || !data) return <div className="page-container"><p>Match not found.</p></div>;

  const { match, odds, headToHead } = data;
  const h2hMatches = headToHead?.matches || [];

  const h2hStats = h2hMatches.reduce(
    (acc, m) => {
      const isHome = m.homeCode === match.homeCode;
      const gf = isHome ? m.homeScore : m.awayScore;
      const ga = isHome ? m.awayScore : m.homeScore;
      if (gf > ga) acc.wins++;
      else if (gf < ga) acc.losses++;
      else acc.draws++;
      acc.goalsFor += gf;
      acc.goalsAgainst += ga;
      return acc;
    },
    { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
  );

  const chartData = h2hMatches.slice(0, 5).reverse().map((m, i) => ({
    name: `M${i + 1}`,
    home: m.homeCode === match.homeCode ? m.homeScore : m.awayScore,
    away: m.homeCode === match.homeCode ? m.awayScore : m.homeScore,
  }));

  return (
    <div className="page-container match-detail">
      <Link to="/schedule" className="back-link">← Back to Schedule</Link>

      <div className="match-header glass-card sticky-header">
        <div className="match-header-meta">
          <span>{match.group || match.stage}</span>
          <span>{dayjs(match.date).format('ddd, MMM D · HH:mm')}</span>
        </div>
        <div className="match-scoreboard">
          <Link to={`/team/${match.homeCode}`} className="scoreboard-team">
            <span className="big-flag">{getFlag(match.homeCode)}</span>
            <span>{getTeamLabel(match.homeCode)}</span>
          </Link>
          <div className="scoreboard-center">
            {match.status === 'finished' ? (
              <span className="final-score">{match.homeScore} - {match.awayScore}</span>
            ) : (
              <span className="vs-label">vs</span>
            )}
            <span className="venue">{match.venue}, {match.city}</span>
          </div>
          <Link to={`/team/${match.awayCode}`} className="scoreboard-team away">
            <span className="big-flag">{getFlag(match.awayCode)}</span>
            <span>{getTeamLabel(match.awayCode)}</span>
          </Link>
        </div>
        {odds && <OddsBar odds={odds} />}
        <Link to="/watch" className="watch-banner">📺 Where to watch this match</Link>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="tab-content glass-card">
        {tab === 'Overview' && (
          <div>
            <h3>Match Info</h3>
            <ul className="info-list">
              <li><strong>Stage:</strong> {match.stage}</li>
              {match.group && <li><strong>Group:</strong> {match.group}</li>}
              <li><strong>Venue:</strong> {match.venue}, {match.city}, {match.country}</li>
              <li><strong>Date:</strong> {dayjs(match.date).format('MMMM D, YYYY HH:mm')}</li>
              {match.penalties && <li><strong>Decided on penalties</strong></li>}
            </ul>
            {odds?.topScorelines && (
              <>
                <h3 style={{ marginTop: '1.5rem' }}>Most Likely Scorelines</h3>
                <div className="scoreline-grid">
                  {odds.topScorelines.map((s) => (
                    <div key={s.score} className="scoreline-chip">
                      <span>{s.score}</span>
                      <span>{s.probability}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'Stats' && odds && (
          <div>
            <h3>Expected Goals (xG)</h3>
            <div className="stat-bar-row">
              <span className="stat-bar-label">{match.homeCode}</span>
              <div className="stat-bar-track">
                <div className="stat-bar-home" style={{ width: `${(odds.xG.home / (odds.xG.home + odds.xG.away)) * 100}%` }} />
                <div className="stat-bar-away" style={{ width: `${(odds.xG.away / (odds.xG.home + odds.xG.away)) * 100}%` }} />
              </div>
              <span className="stat-bar-label" style={{ textAlign: 'left' }}>{match.awayCode}</span>
            </div>
            <p className="xg-values">{odds.xG.home} — {odds.xG.away}</p>

            <h3 style={{ marginTop: '1.5rem' }}>Elo Ratings</h3>
            <div className="elo-row">
              <div><span>{match.homeCode}</span><strong>{odds.eloHome}</strong></div>
              <div><span>{match.awayCode}</span><strong>{odds.eloAway}</strong></div>
            </div>

            <h3 style={{ marginTop: '1.5rem' }}>Win Probability</h3>
            <div className="stat-bar-row">
              <span className="stat-bar-label">{(odds.probabilities.home * 100).toFixed(0)}%</span>
              <div className="stat-bar-track">
                <div className="stat-bar-home" style={{ width: `${odds.probabilities.home * 100}%` }} />
                <div className="stat-bar-away" style={{ width: `${(odds.probabilities.draw + odds.probabilities.away) * 100}%`, background: 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          </div>
        )}

        {tab === 'H2H' && (
          <div>
            <div className="h2h-summary">
              <span>{h2hStats.wins}W</span>
              <span>{h2hStats.draws}D</span>
              <span>{h2hStats.losses}L</span>
              <span>Goals: {h2hStats.goalsFor}-{h2hStats.goalsAgainst}</span>
            </div>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #333' }} />
                  <Bar dataKey="home" fill="#00c853" name={match.homeCode} />
                  <Bar dataKey="away" fill="#40c4ff" name={match.awayCode} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <ul className="h2h-list">
              {h2hMatches.slice(0, 10).map((m) => (
                <li key={m.id}>
                  <span>{m.year}</span>
                  <span>{m.homeCode} {m.homeScore}-{m.awayScore} {m.awayCode}</span>
                </li>
              ))}
              {h2hMatches.length === 0 && <p className="empty">No previous WC meetings</p>}
            </ul>
          </div>
        )}

        {tab === 'Form' && (
          <div>
            <p className="form-note">Recent World Cup form based on historical matches</p>
            <div className="form-teams">
              {[match.homeCode, match.awayCode].map((code) => (
                <Link key={code} to={`/team/${code}`} className="form-team-link">
                  {getFlag(code)} {getTeamLabel(code)} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === 'Lineups' && (
          <div>
            <p className="form-note">Lineups will be available closer to kickoff. Historical squads available on team pages.</p>
            <div className="lineup-placeholder">
              <div className="lineup-side">
                <h4>{getTeamLabel(match.homeCode)}</h4>
                <p>GK · DF · DF · DF · DF · MF · MF · MF · FW · FW · FW</p>
              </div>
              <div className="lineup-side">
                <h4>{getTeamLabel(match.awayCode)}</h4>
                <p>GK · DF · DF · DF · DF · MF · MF · MF · FW · FW · FW</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'News' && (
          <div className="news-list">
            {news.length === 0 ? (
              <p className="empty">No recent news. Check back closer to match day.</p>
            ) : (
              news.map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="news-item">
                  <span className="news-source">{item.source}</span>
                  <span className="news-title">{item.title}</span>
                  <span className="news-date">{item.pubDate}</span>
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
