import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchTeam } from '../../services/api';
import { getFlag, getTeamLabel } from '../../utils/flags';
import MatchCard from '../../components/MatchCard/MatchCard';
import './TeamDetail.css';

export default function TeamDetail() {
  const { teamCode } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['team', teamCode],
    queryFn: () => fetchTeam(teamCode),
  });

  if (isLoading) return <div className="page-container"><div className="skeleton-line" style={{ height: 200 }} /></div>;
  if (!data?.team) return <div className="page-container"><p>Team not found.</p></div>;

  const { team, matches, form } = data;
  const chartData = [
    { name: 'W', value: team.wins },
    { name: 'D', value: team.draws },
    { name: 'L', value: team.losses },
  ];

  return (
    <div className="page-container">
      <Link to="/schedule" className="back-link">← Back</Link>

      <div className="team-hero glass-card">
        <span className="team-hero-flag">{getFlag(teamCode)}</span>
        <h1 className="page-title">{getTeamLabel(teamCode)}</h1>
        <p className="page-subtitle">World Cup all-time record</p>
        <div className="team-stats-row">
          <div><strong>{team.played}</strong><span>Played</span></div>
          <div><strong>{team.wins}</strong><span>Wins</span></div>
          <div><strong>{team.draws}</strong><span>Draws</span></div>
          <div><strong>{team.losses}</strong><span>Losses</span></div>
          <div><strong>{team.goalsFor}</strong><span>GF</span></div>
          <div><strong>{team.goalsAgainst}</strong><span>GA</span></div>
        </div>
        {team.tournaments?.length > 0 && (
          <p className="tournaments">Tournaments: {team.tournaments.join(', ')}</p>
        )}
      </div>

      {form?.length > 0 && (
        <div className="form-section glass-card">
          <h3>Recent Form</h3>
          <div className="form-badges">
            {form.map((f, i) => (
              <span key={i} className={`form-badge form-${f.result}`}>{f.result}</span>
            ))}
          </div>
        </div>
      )}

      <div className="chart-section glass-card">
        <h3>Results Breakdown</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #333' }} />
            <Bar dataKey="value" fill="#00c853" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="section-title">Matches</h2>
      {matches.slice(0, 10).map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  );
}
