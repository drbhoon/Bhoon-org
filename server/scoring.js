const DIMS = ['D', 'I', 'S', 'C'];

function rawToScore(raw, max) {
  return Math.max(0, Math.min(100, Math.round(((raw + max) / (2 * max)) * 100)));
}

function computeScores(responses) {
  const most  = { D: 0, I: 0, S: 0, C: 0 };
  const least = { D: 0, I: 0, S: 0, C: 0 };

  for (const r of responses) {
    if (DIMS.includes(r.most_dim))  most[r.most_dim]++;
    if (DIMS.includes(r.least_dim)) least[r.least_dim]++;
  }

  const g1 = {};
  for (const d of DIMS) {
    g1[d] = rawToScore(most[d] - 6, 18);
  }

  const g2 = {};
  for (const d of DIMS) {
    g2[d] = rawToScore(most[d] - least[d], 24);
  }

  const g3 = {};
  for (const d of DIMS) {
    g3[d] = rawToScore(-least[d] + 6, 18);
  }

  const sortedByG1 = [...DIMS].sort((a, b) => g1[b] - g1[a]);
  const primary_style   = sortedByG1[0];
  const secondary_style = sortedByG1[1];

  return { g1, g2, g3, primary_style, secondary_style, most, least };
}

module.exports = { computeScores, rawToScore, DIMS };
