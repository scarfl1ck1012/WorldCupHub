const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchJson(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const fetchMatches = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchJson(`/matches${q ? `?${q}` : ''}`);
};

export const fetchMatch = (id) => fetchJson(`/matches/${id}`);
export const fetchTeams = () => fetchJson('/teams');
export const fetchTeam = (code) => fetchJson(`/teams/${code}`);
export const fetchOdds = () => fetchJson('/odds');
export const fetchMatchOdds = (matchId) => fetchJson(`/odds/${matchId}`);
export const fetchNews = (team) => fetchJson(`/news${team ? `?team=${team}` : ''}`);
export const fetchBroadcasters = () => fetchJson('/broadcasters');
export const fetchLegends = () => fetchJson('/games/legends');

export const simulateTournament = (userPicks) =>
  fetchJson('/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPicks }),
  });

export const monteCarloSim = (iterations = 3000) =>
  fetchJson('/simulate/monte-carlo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iterations }),
  });

export const fetchStandings = (year) => fetchJson(`/standings/${year}`);
