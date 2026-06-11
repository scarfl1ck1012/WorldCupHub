/**
 * Tournament bracket simulation for WC 2026.
 */

import { predictMatch } from './elo.js';

export function simulateGroupStage(fixtures, ratings, matches, userPicks = {}) {
  const groupFixtures = fixtures.filter((f) => f.group);
  const results = {};

  for (const f of groupFixtures) {
    const pick = userPicks[f.id];
    let homeScore, awayScore;

    if (pick) {
      homeScore = pick.homeScore;
      awayScore = pick.awayScore;
    } else {
      const pred = predictMatch(f.homeCode, f.awayCode, ratings, matches);
      const r = Math.random();
      if (r < pred.probabilities.home) {
        homeScore = 2;
        awayScore = Math.floor(Math.random() * 2);
      } else if (r < pred.probabilities.home + pred.probabilities.draw) {
        homeScore = 1;
        awayScore = 1;
      } else {
        awayScore = 2;
        homeScore = Math.floor(Math.random() * 2);
      }
    }

    results[f.id] = { homeScore, awayScore, homeCode: f.homeCode, awayCode: f.awayCode, group: f.group };
  }

  return results;
}

export function computeGroupStandings(results) {
  const tables = {};

  for (const r of Object.values(results)) {
    const g = r.group.replace('Group ', '');
    if (!tables[g]) tables[g] = {};

    for (const code of [r.homeCode, r.awayCode]) {
      if (!tables[g][code])
        tables[g][code] = { code, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    }

    const h = tables[g][r.homeCode];
    const a = tables[g][r.awayCode];
    h.played++;
    a.played++;
    h.gf += r.homeScore;
    h.ga += r.awayScore;
    a.gf += r.awayScore;
    a.ga += r.homeScore;
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;

    if (r.homeScore > r.awayScore) {
      h.won++;
      h.pts += 3;
      a.lost++;
    } else if (r.homeScore < r.awayScore) {
      a.won++;
      a.pts += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.pts++;
      a.pts++;
    }
  }

  const standings = {};
  for (const [g, teams] of Object.entries(tables)) {
    standings[g] = Object.values(teams).sort(
      (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf
    );
  }
  return standings;
}

export function simulateKnockout(standings, ratings, matches) {
  const qualified = [];
  for (const [, teams] of Object.entries(standings)) {
    qualified.push(teams[0]?.code, teams[1]?.code);
  }
  qualified.filter(Boolean);

  const bracket = [];
  let round = [...qualified];
  const roundNames = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

  for (const stage of roundNames) {
    const nextRound = [];
    for (let i = 0; i < round.length; i += 2) {
      const home = round[i];
      const away = round[i + 1];
      if (!home || !away) continue;

      const pred = predictMatch(home, away, ratings, matches);
      const r = Math.random();
      let winner;
      if (r < pred.probabilities.home) winner = home;
      else if (r < pred.probabilities.home + pred.probabilities.draw) {
        winner = Math.random() > 0.5 ? home : away;
      } else winner = away;

      bracket.push({ stage, home, away, winner });
      nextRound.push(winner);
    }
    round = nextRound;
    if (round.length <= 1) break;
  }

  return { bracket, champion: round[0] || null };
}

export function runFullSimulation(fixtures, ratings, matches, userPicks = {}) {
  const groupResults = simulateGroupStage(fixtures, ratings, matches, userPicks);
  const standings = computeGroupStandings(groupResults);
  const knockout = simulateKnockout(standings, ratings, matches);
  return { groupResults, standings, ...knockout };
}
