/**
 * Elo rating system + Poisson goal model for match predictions and odds.
 */

const K = 32;
const HOME_ADVANTAGE = 100;
const INITIAL_ELO = 1500;

function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function updateElo(eloHome, eloAway, homeScore, awayScore) {
  const homeWin = homeScore > awayScore ? 1 : homeScore === awayScore ? 0.5 : 0;
  const expHome = expectedScore(eloHome + HOME_ADVANTAGE, eloAway);
  const expAway = 1 - expHome;
  const awayWin = 1 - homeWin;

  return {
    home: eloHome + K * (homeWin - expHome),
    away: eloAway + K * (awayWin - expAway),
  };
}

export function buildEloRatings(matches) {
  const ratings = {};
  const history = [];

  const sorted = [...matches]
    .filter((m) => m.status === 'finished')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const m of sorted) {
    if (!ratings[m.homeCode]) ratings[m.homeCode] = INITIAL_ELO;
    if (!ratings[m.awayCode]) ratings[m.awayCode] = INITIAL_ELO;

    const updated = updateElo(
      ratings[m.homeCode],
      ratings[m.awayCode],
      m.homeScore,
      m.awayScore
    );
    ratings[m.homeCode] = updated.home;
    ratings[m.awayCode] = updated.away;

    history.push({ date: m.date, ratings: { ...ratings } });
  }

  return { ratings, history };
}

// Poisson probability
function poisson(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function avgGoals(matches, code, isHome) {
  const relevant = matches.filter(
    (m) =>
      m.status === 'finished' &&
      (isHome ? m.homeCode === code : m.awayCode === code)
  );
  if (relevant.length === 0) return 1.2;
  const total = relevant.reduce(
    (s, m) => s + (isHome ? m.homeScore : m.awayScore),
    0
  );
  return total / relevant.length;
}

export function predictMatch(homeCode, awayCode, ratings, matches) {
  const eloHome = ratings[homeCode] ?? INITIAL_ELO;
  const eloAway = ratings[awayCode] ?? INITIAL_ELO;

  const expHome = expectedScore(eloHome + HOME_ADVANTAGE, eloAway);
  const expAway = expectedScore(eloAway, eloHome + HOME_ADVANTAGE);
  const expDraw = 1 - Math.abs(expHome - expAway) * 0.6;

  const total = expHome + expAway + expDraw;
  let pHome = expHome / total;
  let pDraw = expDraw / total;
  let pAway = expAway / total;

  const lambdaHome = avgGoals(matches, homeCode, true) * (eloHome / INITIAL_ELO);
  const lambdaAway = avgGoals(matches, awayCode, false) * (eloAway / INITIAL_ELO);

  const scorelines = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = poisson(h, lambdaHome) * poisson(a, lambdaAway);
      scorelines.push({ home: h, away: a, probability: p });
    }
  }
  scorelines.sort((a, b) => b.probability - a.probability);
  const top5 = scorelines.slice(0, 5);

  return {
    homeCode,
    awayCode,
    eloHome: Math.round(eloHome),
    eloAway: Math.round(eloAway),
    probabilities: {
      home: round(pHome),
      draw: round(pDraw),
      away: round(pAway),
    },
    odds: {
      home: round(1 / pHome, 2),
      draw: round(1 / pDraw, 2),
      away: round(1 / pAway, 2),
    },
    topScorelines: top5.map((s) => ({
      score: `${s.home}-${s.away}`,
      probability: round(s.probability * 100, 1),
    })),
    xG: { home: round(lambdaHome, 2), away: round(lambdaAway, 2) },
  };
}

export function predictAllFixtures(fixtures, ratings, matches) {
  return fixtures
    .filter((f) => f.homeCode !== 'TBD' && f.awayCode !== 'TBD')
    .map((f) => ({
      matchId: f.id,
      ...predictMatch(f.homeCode, f.awayCode, ratings, matches),
    }));
}

function round(n, d = 3) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

export function monteCarloChampion(fixtures, ratings, matches, iterations = 5000) {
  const groupFixtures = fixtures.filter((f) => f.group && f.status === 'scheduled');
  const champions = {};

  for (let i = 0; i < iterations; i++) {
    const groupTables = {};
    for (const f of groupFixtures) {
      const pred = predictMatch(f.homeCode, f.awayCode, ratings, matches);
      const r = Math.random();
      let hs, as;
      if (r < pred.probabilities.home) {
        hs = 2; as = Math.floor(Math.random() * 2);
      } else if (r < pred.probabilities.home + pred.probabilities.draw) {
        hs = 1; as = 1;
      } else {
        as = 2; hs = Math.floor(Math.random() * 2);
      }
      const g = f.group.replace('Group ', '');
      if (!groupTables[g]) groupTables[g] = {};
      for (const code of [f.homeCode, f.awayCode]) {
        if (!groupTables[g][code])
          groupTables[g][code] = { code, pts: 0, gd: 0, gf: 0 };
      }
      const hc = f.homeCode;
      const ac = f.awayCode;
      groupTables[g][hc].gf += hs;
      groupTables[g][ac].gf += as;
      groupTables[g][hc].gd += hs - as;
      groupTables[g][ac].gd += as - hs;
      if (hs > as) groupTables[g][hc].pts += 3;
      else if (hs < as) groupTables[g][ac].pts += 3;
      else {
        groupTables[g][hc].pts += 1;
        groupTables[g][ac].pts += 1;
      }
    }

    const winners = Object.values(groupTables).map((g) => {
      const sorted = Object.values(g).sort((a, b) => b.pts - a.pts || b.gd - a.gd);
      return sorted[0]?.code;
    }).filter(Boolean);

    if (winners.length > 0) {
      const champ = winners[Math.floor(Math.random() * winners.length)];
      champions[champ] = (champions[champ] || 0) + 1;
    }
  }

  return Object.entries(champions)
    .map(([code, count]) => ({
      code,
      probability: round((count / iterations) * 100, 2),
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 16);
}
