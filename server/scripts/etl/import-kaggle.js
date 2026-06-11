/**
 * ETL: Import World Cup data from Kaggle CSV (if present) or Fjelstul datahub mirror.
 * Outputs processed JSON to data/processed/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(ROOT, 'data', 'processed');
const RAW = path.join(ROOT, 'data', 'raw');

const DATAHUB_MATCHES =
  'https://datahub.io/football/worldcup/_r/-/matches.csv';
const DATAHUB_TEAMS =
  'https://datahub.io/football/worldcup/_r/-/teams.csv';

const TEAM_CODE_MAP = {
  'United States': 'USA',
  'Korea Republic': 'KOR',
  'Korea DPR': 'PRK',
  "Côte d'Ivoire": 'CIV',
  'IR Iran': 'IRN',
  'Republic of Ireland': 'IRL',
  'Trinidad and Tobago': 'TTO',
  'Bosnia and Herzegovina': 'BIH',
  'Czech Republic': 'CZE',
  'Czechoslovakia': 'TCH',
  'Germany FR': 'FRG',
  'Germany DR': 'GDR',
  'Soviet Union': 'URS',
  'Yugoslavia': 'YUG',
  'Serbia and Montenegro': 'SCG',
};

function toCode(name, existingCode) {
  if (existingCode && existingCode.length <= 3) return existingCode.toUpperCase();
  if (TEAM_CODE_MAP[name]) return TEAM_CODE_MAP[name];
  return name
    .replace(/[^a-zA-Z\s]/g, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function readLocalCsv(filename) {
  const p = path.join(RAW, filename);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function normalizeMatch(row, idx) {
  const year = parseInt(row.tournament_name?.match(/\d{4}/)?.[0] || row.year || '0', 10);
  const homeTeam = row.home_team_name || row.home_team || row['Home Team'];
  const awayTeam = row.away_team_name || row.away_team || row['Away Team'];
  const homeCode = toCode(homeTeam, row.home_team_code || row.home_team_id);
  const awayCode = toCode(awayTeam, row.away_team_code || row.away_team_id);
  const homeScore = parseInt(row.home_team_score ?? row.home_score ?? row['Home Score'] ?? '', 10);
  const awayScore = parseInt(row.away_team_score ?? row.away_score ?? row['Away Score'] ?? '', 10);
  const played = !Number.isNaN(homeScore) && !Number.isNaN(awayScore);

  return {
    id: row.match_id || `wc-${year}-${idx}`,
    year,
    date: row.match_date || row.date || row.Date,
    stage: row.stage_name || row.stage || row.Stage || 'Group stage',
    group: row.group_name || row.group || row.Group || null,
    venue: row.stadium_name || row.venue || row.Venue || '',
    city: row.city_name || row.city || row.City || '',
    country: row.country_name || row.country || '',
    homeTeam,
    awayTeam,
    homeCode,
    awayCode,
    homeScore: played ? homeScore : null,
    awayScore: played ? awayScore : null,
    status: played ? 'finished' : 'scheduled',
    extraTime: row.extra_time === '1' || row.extra_time === 1,
    penalties: row.penalty_shootout === '1' || row.penalty_shootout === 1,
  };
}

function buildTeamStats(matches) {
  const teams = {};

  function ensure(code, name) {
    if (!teams[code]) {
      teams[code] = {
        code,
        name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        tournaments: new Set(),
      };
    }
    return teams[code];
  }

  for (const m of matches) {
    if (m.status !== 'finished') continue;
    const home = ensure(m.homeCode, m.homeTeam);
    const away = ensure(m.awayCode, m.awayTeam);
    home.tournaments.add(m.year);
    away.tournaments.add(m.year);
    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
    } else if (m.homeScore < m.awayScore) {
      away.wins++;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
    }
  }

  return Object.values(teams).map((t) => ({
    ...t,
    tournaments: [...t.tournaments].sort((a, b) => b - a),
    points: t.wins * 3 + t.draws,
  }));
}

function buildH2H(matches) {
  const h2h = {};
  for (const m of matches) {
    if (m.status !== 'finished') continue;
    const key = [m.homeCode, m.awayCode].sort().join('-');
    if (!h2h[key]) h2h[key] = { teams: [m.homeCode, m.awayCode], matches: [] };
    h2h[key].matches.push({
      id: m.id,
      year: m.year,
      date: m.date,
      homeCode: m.homeCode,
      awayCode: m.awayCode,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    });
  }
  for (const k of Object.keys(h2h)) {
    h2h[k].matches.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return h2h;
}

// FIFA World Cup 2026 — representative fixture schedule (48-team format)
function generateFixtures2026() {
  const groups = {
    A: ['MEX', 'RSA', 'KOR', 'UEFA_A'],
    B: ['CAN', 'QAT', 'SUI', 'UEFA_B'],
    C: ['BRA', 'MAR', 'HAI', 'UEFA_C'],
    D: ['USA', 'AUS', 'PAR', 'UEFA_D'],
    E: ['GER', 'ECU', 'CIV', 'UEFA_E'],
    F: ['NED', 'JPN', 'TUN', 'UEFA_F'],
    G: ['BEL', 'EGY', 'IRN', 'UEFA_G'],
    H: ['ESP', 'CRC', 'KSA', 'UEFA_H'],
    I: ['FRA', 'SEN', 'NZL', 'UEFA_I'],
    J: ['ARG', 'ALG', 'AUT', 'UEFA_J'],
    K: ['POR', 'GHA', 'PAN', 'UEFA_K'],
    L: ['ENG', 'URU', 'CPV', 'UEFA_L'],
  };

  const venues = [
    { stadium: 'MetLife Stadium', city: 'East Rutherford', country: 'USA' },
    { stadium: 'SoFi Stadium', city: 'Inglewood', country: 'USA' },
    { stadium: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
    { stadium: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
    { stadium: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
    { stadium: 'Estadio Azteca', city: 'Mexico City', country: 'MEX' },
    { stadium: 'Estadio BBVA', city: 'Monterrey', country: 'MEX' },
    { stadium: 'BC Place', city: 'Vancouver', country: 'CAN' },
  ];

  const fixtures = [];
  let matchNum = 1;
  const baseDate = new Date('2026-06-11T19:00:00Z');

  for (const [group, teamCodes] of Object.entries(groups)) {
    const pairs = [
      [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
    ];
    pairs.forEach(([hi, ai], roundIdx) => {
      const venue = venues[(matchNum - 1) % venues.length];
      const kickoff = new Date(baseDate);
      kickoff.setDate(kickoff.getDate() + Math.floor((matchNum - 1) / 4));
      kickoff.setHours(13 + (matchNum % 3) * 4);

      fixtures.push({
        id: `wc2026-${String(matchNum).padStart(3, '0')}`,
        year: 2026,
        date: kickoff.toISOString(),
        stage: 'Group stage',
        group: `Group ${group}`,
        venue: venue.stadium,
        city: venue.city,
        country: venue.country,
        homeTeam: teamCodes[hi],
        awayTeam: teamCodes[ai],
        homeCode: teamCodes[hi],
        awayCode: teamCodes[ai],
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      });
      matchNum++;
    });
  }

  // Knockout placeholders
  const knockoutStages = [
    'Round of 32', 'Round of 32', 'Round of 16', 'Round of 16',
    'Quarter-final', 'Quarter-final', 'Semi-final', 'Semi-final',
    'Third place', 'Final',
  ];
  knockoutStages.forEach((stage, i) => {
    const kickoff = new Date('2026-07-01T19:00:00Z');
    kickoff.setDate(kickoff.getDate() + i * 2);
    fixtures.push({
      id: `wc2026-ko-${i + 1}`,
      year: 2026,
      date: kickoff.toISOString(),
      stage,
      group: null,
      venue: venues[i % venues.length].stadium,
      city: venues[i % venues.length].city,
      country: venues[i % venues.length].country,
      homeTeam: 'TBD',
      awayTeam: 'TBD',
      homeCode: 'TBD',
      awayCode: 'TBD',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
    });
  });

  return fixtures;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(RAW, { recursive: true });

  let csvText = readLocalCsv('matches.csv');
  if (!csvText) {
    console.log('Fetching matches from datahub.io...');
    try {
      csvText = await fetchCsv(DATAHUB_MATCHES);
      fs.writeFileSync(path.join(RAW, 'matches.csv'), csvText);
    } catch (e) {
      console.warn('Could not fetch remote data:', e.message);
      csvText = null;
    }
  }

  let matches = [];
  if (csvText) {
    const rows = parse(csvText, { columns: true, skip_empty_lines: true });
    matches = rows.map((r, i) => normalizeMatch(r, i)).filter((m) => m.year > 0);
    console.log(`Parsed ${matches.length} historical matches`);
  }

  const fixtures2026 = generateFixtures2026();
  const allMatches = [...matches, ...fixtures2026];

  const teams = buildTeamStats(matches);
  const h2h = buildH2H(matches);

  fs.writeFileSync(path.join(OUT, 'matches.json'), JSON.stringify(matches, null, 2));
  fs.writeFileSync(path.join(OUT, 'fixtures2026.json'), JSON.stringify(fixtures2026, null, 2));
  fs.writeFileSync(path.join(OUT, 'teams.json'), JSON.stringify(teams, null, 2));
  fs.writeFileSync(path.join(OUT, 'h2h.json'), JSON.stringify(h2h, null, 2));
  fs.writeFileSync(path.join(OUT, 'all-matches.json'), JSON.stringify(allMatches, null, 2));

  console.log('ETL complete. Output:', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
