const DIMS     = ['D', 'I', 'S', 'C'];
const W        = 220;
const H        = 300;
const PAD_TOP  = 20;
const PAD_BOT  = 30;
const PAD_L    = 32;
const PAD_R    = 20;
const CHART_W  = W - PAD_L - PAD_R;
const CHART_H  = H - PAD_TOP - PAD_BOT;
const COL_W    = CHART_W / 4;

function scoreToY(score) {
  return PAD_TOP + CHART_H - (score / 100) * CHART_H;
}

function dimToX(i) {
  return PAD_L + i * COL_W + COL_W / 2;
}

export default function PPAGraph({ title, scores, benchmark }) {
  const points  = DIMS.map((d, i) => ({ x: dimToX(i), y: scoreToY(scores[d]), score: scores[d], dim: d }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const ticks    = [0, 25, 50, 75, 100];

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#1F3864' }}>{title}</p>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L} y1={scoreToY(t)}
              x2={W - PAD_R} y2={scoreToY(t)}
              stroke="#e0e8f0" strokeWidth={1}
            />
            <text x={PAD_L - 4} y={scoreToY(t) + 4} textAnchor="end" fontSize={10} fill="#aaa">{t}</text>
          </g>
        ))}

        {benchmark && DIMS.map((d, i) => {
          if (!benchmark[d]) return null;
          const { min, max } = benchmark[d];
          const yTop = scoreToY(max);
          const yBot = scoreToY(min);
          return (
            <rect
              key={d}
              x={PAD_L + i * COL_W + 4}
              y={yTop}
              width={COL_W - 8}
              height={yBot - yTop}
              fill="#2E5496"
              opacity={0.12}
              rx={3}
            />
          );
        })}

        {DIMS.map((d, i) => (
          <text key={d} x={dimToX(i)} y={H - 8} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1F3864">
            {d}
          </text>
        ))}

        <polyline
          points={polyline}
          fill="none"
          stroke="#2E5496"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {points.map((p) => (
          <g key={p.dim}>
            <circle cx={p.x} cy={p.y} r={5} fill="#2E5496" stroke="#fff" strokeWidth={1.5} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fontWeight="700" fill="#1F3864">
              {p.score}
            </text>
          </g>
        ))}

        <line x1={PAD_L} y1={PAD_TOP} x2={PAD_L} y2={PAD_TOP + CHART_H} stroke="#ccc" strokeWidth={1} />
      </svg>
    </div>
  );
}
