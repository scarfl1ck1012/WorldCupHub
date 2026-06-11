import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import { buildEloRatings, predictAllFixtures, predictMatch, monteCarloChampion } from './engines/elo.js';
import { runFullSimulation, computeGroupStandings, simulateGroupStage } from './engines/bracketSim.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data/processed');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

let cache = { loadedAt: 0, data: null };

function loadData() {
  const now = Date.now();
  if (cache.data && now - cache.loadedAt < 60_000) return cache.data;

  const read = (file) => {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  };

  const matches = read('matches.json') || [];
  const fixtures2026 = read('fixtures2026.json') || [];
  const teams = read('teams.json') || [];
  const h2h = read('h2h.json') || {};
  const { ratings } = buildEloRatings(matches);
  const odds = predictAllFixtures(fixtures2026, ratings, matches);

  cache = {
    loadedAt: now,
    data: { matches, fixtures2026, teams, h2h, ratings, odds },
  };
  return cache.data;
}

// Routes
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.get('/api/matches', (req, res) => {
  const { year, team, stage } = req.query;
  const { matches, fixtures2026 } = loadData();
  let all = year === '2026' ? fixtures2026 : [...matches, ...fixtures2026];

  if (year && year !== '2026') all = all.filter((m) => m.year === parseInt(year, 10));
  if (team) all = all.filter((m) => m.homeCode === team || m.awayCode === team);
  if (stage === 'knockout') all = all.filter((m) => m.group === null);
  if (stage === 'group') all = all.filter((m) => m.group !== null);

  res.json(all.sort((a, b) => new Date(a.date) - new Date(b.date)));
});

app.get('/api/matches/:id', (req, res) => {
  const { matches, fixtures2026, ratings, odds, h2h } = loadData();
  const all = [...matches, ...fixtures2026];
  const match = all.find((m) => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const matchOdds = odds.find((o) => o.matchId === match.id);
  const h2hKey = [match.homeCode, match.awayCode].sort().join('-');
  const headToHead = h2h[h2hKey] || { matches: [] };

  const pred =
    match.homeCode !== 'TBD'
      ? predictMatch(match.homeCode, match.awayCode, ratings, matches)
      : null;

  res.json({ match, odds: matchOdds || pred, headToHead });
});

app.get('/api/teams', (_, res) => {
  res.json(loadData().teams);
});

app.get('/api/teams/:code', (req, res) => {
  const { teams, matches, fixtures2026 } = loadData();
  const team = teams.find((t) => t.code === req.params.code);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const teamMatches = [...matches, ...fixtures2026]
    .filter((m) => m.homeCode === req.params.code || m.awayCode === req.params.code)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const form = teamMatches
    .filter((m) => m.status === 'finished')
    .slice(0, 5)
    .map((m) => {
      const isHome = m.homeCode === req.params.code;
      const gf = isHome ? m.homeScore : m.awayScore;
      const ga = isHome ? m.awayScore : m.homeScore;
      return { result: gf > ga ? 'W' : gf < ga ? 'L' : 'D', score: `${gf}-${ga}`, opponent: isHome ? m.awayCode : m.homeCode };
    });

  res.json({ team, matches: teamMatches.slice(0, 20), form });
});

app.get('/api/odds', (_, res) => {
  res.json(loadData().odds);
});

app.get('/api/odds/:matchId', (req, res) => {
  const odds = loadData().odds.find((o) => o.matchId === req.params.matchId);
  if (!odds) return res.status(404).json({ error: 'Odds not found' });
  res.json(odds);
});

app.post('/api/simulate', (req, res) => {
  const { userPicks } = req.body || {};
  const { fixtures2026, matches, ratings } = loadData();
  const result = runFullSimulation(fixtures2026, ratings, matches, userPicks);
  res.json(result);
});

app.post('/api/simulate/monte-carlo', (req, res) => {
  const { iterations = 3000 } = req.body || {};
  const { fixtures2026, matches, ratings } = loadData();
  const champions = monteCarloChampion(fixtures2026, ratings, matches, iterations);
  res.json({ champions });
});

app.get('/api/standings/:year', (req, res) => {
  const year = parseInt(req.params.year, 10);
  const { fixtures2026, matches, ratings } = loadData();
  const source = year === 2026 ? fixtures2026 : matches.filter((m) => m.year === year && m.group);
  const results = simulateGroupStage(source, ratings, matches);
  res.json(computeGroupStandings(results));
});

// News RSS proxy
const rssParser = new Parser();
const NEWS_FEEDS = [
  { name: 'BBC Sport Football', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  { name: 'FIFA', url: 'https://www.fifa.com/rss-feeds/news' },
];

let newsCache = { items: [], fetchedAt: 0 };

app.get('/api/news', async (req, res) => {
  const { team } = req.query;
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
      } catch {
        // Feed may be unavailable
      }
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
  res.json(items.slice(0, 20));
});

// Broadcasters data
app.get('/api/broadcasters', (_, res) => {
  res.json(BROADCASTERS);
});

const BROADCASTERS = [
  { country: 'United States', code: 'US', networks: ['Fox Sports', 'Telemundo', 'FIFA+'], links: ['https://www.foxsports.com', 'https://www.telemundo.com', 'https://www.fifa.com/fifaplus'] },
  { country: 'Canada', code: 'CA', networks: ['TSN', 'CTV', 'FIFA+'], links: ['https://www.tsn.ca', 'https://www.ctv.ca', 'https://www.fifa.com/fifaplus'] },
  { country: 'Mexico', code: 'MX', networks: ['Televisa', 'TV Azteca', 'FIFA+'], links: ['https://www.televisa.com', 'https://www.tvazteca.com', 'https://www.fifa.com/fifaplus'] },
  { country: 'United Kingdom', code: 'GB', networks: ['BBC', 'ITV', 'FIFA+'], links: ['https://www.bbc.co.uk/sport/football', 'https://www.itv.com', 'https://www.fifa.com/fifaplus'] },
  { country: 'Germany', code: 'DE', networks: ['ARD', 'ZDF', 'FIFA+'], links: ['https://www.ard.de', 'https://www.zdf.de', 'https://www.fifa.com/fifaplus'] },
  { country: 'France', code: 'FR', networks: ['TF1', 'beIN Sports', 'FIFA+'], links: ['https://www.tf1.fr', 'https://www.beinsports.com', 'https://www.fifa.com/fifaplus'] },
  { country: 'Brazil', code: 'BR', networks: ['Globo', 'FIFA+'], links: ['https://globoesporte.globo.com', 'https://www.fifa.com/fifaplus'] },
  { country: 'Australia', code: 'AU', networks: ['SBS', 'FIFA+'], links: ['https://www.sbs.com.au', 'https://www.fifa.com/fifaplus'] },
  { country: 'India', code: 'IN', networks: ['Sports18', 'JioCinema', 'FIFA+'], links: ['https://www.sports18.com', 'https://www.jiocinema.com', 'https://www.fifa.com/fifaplus'] },
  { country: 'Japan', code: 'JP', networks: ['Fuji TV', 'NHK', 'FIFA+'], links: ['https://www.fujitv.co.jp', 'https://www.nhk.or.jp', 'https://www.fifa.com/fifaplus'] },
];

// Game data: legends for Perfect Run
app.get('/api/games/legends', (_, res) => {
  res.json(LEGENDS);
});

const LEGENDS = [
  { name: 'Pelé', nation: 'BRA', position: 'FW', rating: 98, era: '1960s' },
  { name: 'Maradona', nation: 'ARG', position: 'MF', rating: 97, era: '1980s' },
  { name: 'Zidane', nation: 'FRA', position: 'MF', rating: 96, era: '2000s' },
  { name: 'Ronaldo', nation: 'BRA', position: 'FW', rating: 96, era: '2000s' },
  { name: 'Messi', nation: 'ARG', position: 'FW', rating: 99, era: '2010s' },
  { name: 'Cristiano Ronaldo', nation: 'POR', position: 'FW', rating: 97, era: '2010s' },
  { name: 'Xavi', nation: 'ESP', position: 'MF', rating: 94, era: '2010s' },
  { name: 'Iniesta', nation: 'ESP', position: 'MF', rating: 94, era: '2010s' },
  { name: 'Müller', nation: 'GER', position: 'FW', rating: 95, era: '1970s' },
  { name: 'Beckenbauer', nation: 'GER', position: 'DF', rating: 94, era: '1970s' },
  { name: 'Cafu', nation: 'BRA', position: 'DF', rating: 92, era: '2000s' },
  { name: 'Maldini', nation: 'ITA', position: 'DF', rating: 95, era: '1990s' },
  { name: 'Buffon', nation: 'ITA', position: 'GK', rating: 94, era: '2000s' },
  { name: 'Neuer', nation: 'GER', position: 'GK', rating: 93, era: '2010s' },
  { name: 'Henry', nation: 'FRA', position: 'FW', rating: 93, era: '2000s' },
  { name: 'Ronaldinho', nation: 'BRA', position: 'MF', rating: 95, era: '2000s' },
  { name: 'Cruyff', nation: 'NED', position: 'FW', rating: 96, era: '1970s' },
  { name: 'Charlton', nation: 'ENG', position: 'MF', rating: 92, era: '1960s' },
  { name: 'Kane', nation: 'ENG', position: 'FW', rating: 91, era: '2020s' },
  { name: 'Mbappé', nation: 'FRA', position: 'FW', rating: 93, era: '2020s' },
  { name: 'Modrić', nation: 'CRO', position: 'MF', rating: 92, era: '2010s' },
  { name: 'Salah', nation: 'EGY', position: 'FW', rating: 91, era: '2020s' },
  { name: 'Neymar', nation: 'BRA', position: 'FW', rating: 92, era: '2020s' },
  { name: 'Van Basten', nation: 'NED', position: 'FW', rating: 94, era: '1980s' },
];

app.listen(PORT, () => {
  console.log(`WC API running on http://localhost:${PORT}`);
  try {
    loadData();
    console.log('Data loaded successfully');
  } catch (e) {
    console.warn('Data not yet processed. Run: npm run etl');
  }
});
