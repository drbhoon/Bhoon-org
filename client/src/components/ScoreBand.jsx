const BANDS = [
  { label: 'Very High', min: 80, bg: '#1a2e4a', color: '#fff' },
  { label: 'High',      min: 60, bg: '#2563a8', color: '#fff' },
  { label: 'Moderate',  min: 40, bg: '#e8f0fb', color: '#1a2e4a' },
  { label: 'Low',       min: 20, bg: '#f0f3f8', color: '#666' },
  { label: 'Very Low',  min: 0,  bg: '#f8d7da', color: '#721c24' },
];

export default function ScoreBand({ score }) {
  const band = BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 700,
      background: band.bg,
      color: band.color,
      letterSpacing: 0.3,
    }}>
      {band.label}
    </span>
  );
}
