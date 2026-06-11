import Parser from 'rss-parser';
import { predictMatch, monteCarloChampion } from '../../server/engines/elo.js';
import { runFullSimulation, computeGroupStandings, simulateGroupStage } from '../../server/engines/bracketSim.js';
import { loadData } from './data.js';
import { BROADCASTERS, LEGENDS, NEWS_FEEDS } from './constants.js';

const rssParser = new Parser();
let newsCache = { items: [], fetchedAt: 0 };

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function getQuery(url) {
  const i = url.indexOf('?');
  if (i === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(i + 1)));
}

export async function routeRequest(req, res, slug) {
  const segments = slug || [];
  const pathKey = segments.join('/');
  const method = req.method;
  const query = { ...req.query, ...getQuery(req.url || '') };
  delete query.slug;

  // GET /api/health
  if (method === 'GET' && pathKey === 'health') {
    return res.status(200).json({ ok: true });
  }

  // GET /api/matches
  if (method === 'GET' && pathKey === 'matches') {
    const { year, team, stage } = query;
    const { matches, fixtures2026 } = loadData();
    let all = year === '2026' ? fixtures2026 : [...matches, ...fixtures2026];
    if (year && year !== '2026') all = all.filter((m) => m.year === parseInt(year, 10));
    if (team) all = all.filter((m) => m.homeCode === team || m.awayCode === team);
    if (stage === 'knockout') all = all.filter((m) => m.group === null);
    if (stage === 'group') all = all.filter((m) => m.group !== null);
    return res.status(200).json(all.sort((a, b) => new Date(a.date) - new Date(b.date)));
  }

  // GET /api/matches/:id
  if (method === 'GET' && segments[0] === 'matches' && segments.length === 2) {
    const id = segments[1];
    const { matches, fixtures2026, ratings, odds, h2h } = loadData();
    const all = [...matches, ...fixtures2026];
    const match = all.find((m) => m.id === id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    const matchOdds = odds.find((o) => o.matchId === match.id);
    const h2hKey = [match.homeCode, match.awayCode].sort().join('-');
    const headToHead = h2h[h2hKey] || { matches: [] };
    const pred = match.homeCode !== 'TBD'
      ? predictMatch(match.homeCode, match.awayCode, ratings, matches)
      : null;
    return res.status(200).json({ match, odds: matchOdds || pred, headToHead });
  }

  // GET /api/teams
  if (method === 'GET' && pathKey === 'teams') {
    return res.status(200).json(loadData().teams);
  }

  // GET /api/teams/:code
  if (method === 'GET' && segments[0] === 'teams' && segments.length === 2) {
    const code = segments[1];
    const { teams, matches, fixtures2026 } = loadData();
    const team = teams.find((t) => t.code === code);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const teamMatches = [...matches, ...fixtures2026]
      .filter((m) => m.homeCode === code || m.awayCode === code)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const form = teamMatches
      .filter((m) => m.status === 'finished')
      .slice(0, 5)
      .map((m) => {
        const isHome = m.homeCode === code;
        const gf = isHome ? m.homeScore : m.awayScore;
        const ga = isHome ? m.awayScore : m.homeScore;
        return {
          result: gf > ga ? 'W' : gf < ga ? 'L' : 'D',
          score: `${gf}-${ga}`,
          opponent: isHome ? m.awayCode : m.homeCode,
        };
      });
    return res.status(200).json({ team, matches: teamMatches.slice(0, 20), form });
  }

  // GET /api/odds
  if (method === 'GET' && pathKey === 'odds') {
    return res.status(200).json(loadData().odds);
  }

  // GET /api/odds/:matchId
  if (method === 'GET' && segments[0] === 'odds' && segments.length === 2) {
    const odds = loadData().odds.find((o) => o.matchId === segments[1]);
    if (!odds) return res.status(404).json({ error: 'Odds not found' });
    return res.status(200).json(odds);
  }

  // POST /api/simulate
  if (method === 'POST' && pathKey === 'simulate') {
    const { userPicks } = parseBody(req);
    const { fixtures2026, matches, ratings } = loadData();
    return res.status(200).json(runFullSimulation(fixtures2026, ratings, matches, userPicks));
  }

  // POST /api/simulate/monte-carlo
  if (method === 'POST' && pathKey === 'simulate/monte-carlo') {
    const { iterations = 3000 } = parseBody(req);
    const { fixtures2026, matches, ratings } = loadData();
    const champions = monteCarloChampion(fixtures2026, ratings, matches, iterations);
    return res.status(200).json({ champions });
  }

  // GET /api/standings/:year
  if (method === 'GET' && segments[0] === 'standings' && segments.length === 2) {
    const year = parseInt(segments[1], 10);
    const { fixtures2026, matches, ratings } = loadData();
    const source = year === 2026 ? fixtures2026 : matches.filter((m) => m.year === year && m.group);
    const results = simulateGroupStage(source, ratings, matches);
    return res.status(200).json(computeGroupStandings(results));
  }

  // GET /api/news
  if (method === 'GET' && pathKey === 'news') {
    const { team } = query;
    const now = Date.now();
    if (now - newsCache.fetchedAt > 300_000) {
      const items = [];
      for (const feed of NEWS_FEEDS) {
        try {
          const parsed = await rssParser.parseURL(feed.url);
          for (const item of parsed.items.slice(0, 10)) {
            items.push({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              source: feed.name,
              summary: item.contentSnippet?.slice(0, 200) || '',
            });
          }
        } catch { /* feed unavailable */ }
      }
      newsCache = { items, fetchedAt: now };
    }
    let items = newsCache.items;
    if (team) {
      const q = team.toLowerCase();
      items = items.filter(
        (i) => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)
      );
    }
    return res.status(200).json(items.slice(0, 20));
  }

  // GET /api/broadcasters
  if (method === 'GET' && pathKey === 'broadcasters') {
    return res.status(200).json(BROADCASTERS);
  }

  // GET /api/games/legends
  if (method === 'GET' && pathKey === 'games/legends') {
    return res.status(200).json(LEGENDS);
  }

  return res.status(404).json({ error: 'Not found' });
}
