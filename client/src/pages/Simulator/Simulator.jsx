import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMatches } from '../../services/api';
import { simulateTournament, monteCarloSim } from '../../services/api';
import { saveSimulation } from '../../services/supabase';
import useAuth from '../../hooks/useAuth';
import { getFlag, getTeamLabel } from '../../utils/flags';
import './Simulator.css';

export default function Simulator() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [monteCarlo, setMonteCarlo] = useState(null);
  const [userPicks, setUserPicks] = useState({});

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', '2026'],
    queryFn: () => fetchMatches({ year: '2026', stage: 'group' }),
  });

  const simMutation = useMutation({
    mutationFn: () => simulateTournament(userPicks),
    onSuccess: async (data) => {
      setResult(data);
      if (user && data.champion) {
        await saveSimulation(user.id, 'My Simulation', data, data.champion);
      }
    },
  });

  const mcMutation = useMutation({
    mutationFn: () => monteCarloSim(3000),
    onSuccess: setMonteCarlo,
  });

  const groupMatches = matches.filter((m) => m.group && m.homeCode !== 'TBD');

  const setPick = (matchId, homeScore, awayScore) => {
    setUserPicks((prev) => ({
      ...prev,
      [matchId]: { homeScore, awayScore },
    }));
  };

  return (
    <div className="page-container simulator-page">
      <h1 className="page-title">Tournament Simulator</h1>
      <p className="page-subtitle">Simulate WC 2026 — pick group results or let the model decide</p>

      <div className="sim-actions">
        <button className="btn btn-primary" onClick={() => simMutation.mutate()} disabled={simMutation.isPending}>
          {simMutation.isPending ? 'Simulating...' : 'Simulate Tournament'}
        </button>
        <button className="btn btn-ghost" onClick={() => mcMutation.mutate()} disabled={mcMutation.isPending}>
          {mcMutation.isPending ? 'Running...' : 'Monte Carlo (3000 runs)'}
        </button>
      </div>

      {monteCarlo?.champions && (
        <div className="glass-card mc-chart">
          <h3>Champion Probability</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monteCarlo.champions.slice(0, 10)} layout="vertical">
              <XAxis type="number" stroke="#666" unit="%" />
              <YAxis type="category" dataKey="code" stroke="#666" width={40} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #333' }} />
              <Bar dataKey="probability" fill="#ffd700" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {result && (
        <div className="sim-results">
          <div className="champion-banner glass-card">
            <span>🏆 Champion</span>
            <strong>{getFlag(result.champion)} {getTeamLabel(result.champion)}</strong>
          </div>

          {result.standings && (
            <div className="standings-grid">
              {Object.entries(result.standings).map(([group, teams]) => (
                <div key={group} className="group-standings glass-card">
                  <h4>Group {group}</h4>
                  <table>
                    <thead><tr><th>Team</th><th>Pts</th><th>GD</th></tr></thead>
                    <tbody>
                      {teams.map((t) => (
                        <tr key={t.code}>
                          <td>{getFlag(t.code)} {getTeamLabel(t.code)}</td>
                          <td>{t.pts}</td>
                          <td>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {result.bracket?.length > 0 && (
            <div className="knockout-bracket glass-card">
              <h3>Knockout Results</h3>
              {result.bracket.map((m, i) => (
                <div key={i} className="bracket-match">
                  <span className="bracket-stage">{m.stage}</span>
                  <span>{getFlag(m.home)} {getTeamLabel(m.home)} vs {getTeamLabel(m.away)} {getFlag(m.away)}</span>
                  <span className="bracket-winner">→ {getFlag(m.winner)} {getTeamLabel(m.winner)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h2 className="section-title">Pick Group Results (optional)</h2>
      <div className="group-picks">
        {groupMatches.slice(0, 12).map((m) => (
          <div key={m.id} className="group-pick glass-card">
            <span className="pick-label">{m.group}: {getTeamLabel(m.homeCode)} vs {getTeamLabel(m.awayCode)}</span>
            <div className="pick-scores">
              <input
                type="number" min="0" max="9"
                placeholder="H"
                onChange={(e) => setPick(m.id, parseInt(e.target.value, 10) || 0, userPicks[m.id]?.awayScore ?? 0)}
              />
              <span>-</span>
              <input
                type="number" min="0" max="9"
                placeholder="A"
                onChange={(e) => setPick(m.id, userPicks[m.id]?.homeScore ?? 0, parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
