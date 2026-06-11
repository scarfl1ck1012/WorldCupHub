import fs from 'fs';
import path from 'path';
import { buildEloRatings, predictAllFixtures } from '../../server/engines/elo.js';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data', 'processed');

let cache = { loadedAt: 0, data: null };

export function loadData() {
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
