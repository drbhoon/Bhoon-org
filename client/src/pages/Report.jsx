import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import PPAGraph    from '../components/PPAGraph.jsx';
import ScoreBand   from '../components/ScoreBand.jsx';

const DIM_COLORS = { D: '#c0392b', I: '#e67e22', S: '#27ae60', C: '#2563a8' };
const FIT_BADGE  = {
  Strong:   { bg: '#d4edda', color: '#155724' },
  Good:     { bg: '#cce5ff', color: '#004085' },
  Moderate: { bg: '#fff3cd', color: '#856404' },
};

export default function Report() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get(`/report/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>Loading report…</div>
    );
  }
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#c0392b', fontSize: 16 }}>{error}</div>
    );
  }
  if (!data) return null;

  if (data.status !== 'completed' || !data.report) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <h2 style={{ color: '#856404', fontWeight: 900, margin: '0 0 12px' }}>Report not yet available</h2>
        <p style={{ color: '#666', fontSize: 15, margin: '0 0 24px' }}>
          {data.status === 'queued'
            ? `Your report is being reviewed and will be emailed to ${data.email} once ready.`
            : 'Your report is currently being generated. Please check back in a moment.'}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: '#1a2e4a', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { report, scores, full_name, created_at } = data;
  const dateStr = new Date(created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", maxWidth: 800, margin: '0 auto' }}>
      {/* Print button */}
      <div className="no-print" style={{ textAlign: 'right', marginBottom: 16 }}>
        <button
          onClick={() => window.print()}
          style={{ background: '#f0f3f8', color: '#1a2e4a', border: '1.5px solid #d0d9e8', borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Print / Save PDF
        </button>
      </div>

      {/* ── 1. Cover ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#1a2e4a', borderRadius: 12, padding: '36px 40px', marginBottom: 20, color: '#fff' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
          DISC Personality Profile
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, lineHeight: 1.2 }}>{full_name}</h1>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 18 }}>{dateStr}</div>

        <div style={{ fontSize: 24, fontWeight: 800, color: '#f0c070', marginBottom: 12 }}>
          {report.profile_headline}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {scores && ['D', 'I', 'S', 'C'].map((d) => (
            <div key={d} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px',
            }}>
              <span style={{ fontWeight: 900, fontSize: 15, color: '#f0c070' }}>{d}</span>
              <span style={{ fontSize: 13, color: '#fff' }}>{scores.g1[d]}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 4 }}>
            <span style={{ background: DIM_COLORS[scores?.primary_style], color: '#fff', borderRadius: 6, padding: '4px 12px', fontWeight: 800, fontSize: 13 }}>
              Primary: {scores?.primary_style}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 6, padding: '4px 12px', fontWeight: 700, fontSize: 13 }}>
              Secondary: {scores?.secondary_style}
            </span>
          </div>
        </div>

        {report.descriptive_words && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {report.descriptive_words.map((w) => (
              <span key={w} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. DISC Graphs ─────────────────────────────────────────────────────── */}
      {scores && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px', marginBottom: 20, border: '1px solid #e0e8f0' }}>
          <h2 style={sectionHead}>DISC Graphs</h2>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
            <PPAGraph title="Graph I — Work Mask"      scores={scores.g1} />
            <PPAGraph title="Graph II — Under Pressure" scores={scores.g2} />
            <PPAGraph title="Graph III — Self Image"    scores={scores.g3} />
          </div>
        </div>
      )}

      {/* ── 3. Self Image ─────────────────────────────────────────────────────── */}
      <ReportSection title="Self Image" body={report.self_image} />

      {/* ── 4. Work Style ─────────────────────────────────────────────────────── */}
      <ReportSection title="Work Style" body={report.work_style} />

      {/* ── 5. Under Pressure ─────────────────────────────────────────────────── */}
      <ReportSection title="Under Pressure" body={report.under_pressure} accent="#fef0f0" />

      {/* ── 6. Job Emphasis ───────────────────────────────────────────────────── */}
      {report.job_emphasis && (
        <div style={card}>
          <h2 style={sectionHead}>Job Emphasis</h2>
          <div style={{ background: '#e8f0fb', borderRadius: 8, padding: '14px 18px', marginBottom: 14 }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#1a2e4a' }}>{report.job_emphasis.headline}</span>
          </div>
          <p style={bodyText}>{report.job_emphasis.description}</p>
        </div>
      )}

      {/* ── 7. Motivators & Demotivators ────────────────────────────────────── */}
      {(report.motivators || report.demotivators) && (
        <div style={card}>
          <h2 style={sectionHead}>Motivators &amp; Demotivators</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <h3 style={{ color: '#1a7a42', fontSize: 14, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>What drives you</h3>
              <p style={bodyText}>{report.motivators}</p>
            </div>
            <div>
              <h3 style={{ color: '#c0392b', fontSize: 14, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>What suppresses you</h3>
              <p style={bodyText}>{report.demotivators}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Career Paths ──────────────────────────────────────────────────── */}
      {report.career_paths?.length > 0 && (
        <div style={card}>
          <h2 style={sectionHead}>Career Paths</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e8f0' }}>
                <th style={th}>Domain</th>
                <th style={{ ...th, width: 100, textAlign: 'center' }}>Fit</th>
                <th style={th}>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {report.career_paths.map((cp, i) => {
                const fb = FIT_BADGE[cp.fit] || { bg: '#f0f3f8', color: '#555' };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f3f8' }}>
                    <td style={{ ...td, fontWeight: 700, color: '#1a2e4a' }}>{cp.domain}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', background: fb.bg, color: fb.color, borderRadius: 12, padding: '3px 12px', fontWeight: 700, fontSize: 12 }}>
                        {cp.fit}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#555', lineHeight: 1.5 }}>{cp.rationale}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 9. Development Focus ─────────────────────────────────────────────── */}
      {report.development_focus?.length > 0 && (
        <div style={card}>
          <h2 style={sectionHead}>Development Focus</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e8f0' }}>
                <th style={th}>Area</th>
                <th style={th}>Suggestion</th>
                <th style={{ ...th, width: 110, textAlign: 'center' }}>Timeline</th>
              </tr>
            </thead>
            <tbody>
              {report.development_focus.map((df, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f3f8' }}>
                  <td style={{ ...td, fontWeight: 700, color: '#1a2e4a' }}>{df.area}</td>
                  <td style={{ ...td, color: '#555', lineHeight: 1.5 }}>{df.suggestion}</td>
                  <td style={{ ...td, textAlign: 'center', color: '#2563a8', fontWeight: 700, fontSize: 12 }}>{df.timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 10. Self-Coaching Tip ─────────────────────────────────────────────── */}
      {report.self_coaching_tip && (
        <div style={{ background: '#1a2e4a', borderRadius: 12, padding: '28px 32px', marginBottom: 20 }}>
          <h2 style={{ ...sectionHead, color: '#f0c070', marginBottom: 14 }}>Self-Coaching Tip</h2>
          <p style={{ margin: 0, fontSize: 16, color: '#fff', lineHeight: 1.7, fontStyle: 'italic' }}>
            "{report.self_coaching_tip}"
          </p>
        </div>
      )}
    </div>
  );
}

function ReportSection({ title, body, accent }) {
  return (
    <div style={{ ...card, background: accent || '#fff' }}>
      <h2 style={sectionHead}>{title}</h2>
      <p style={bodyText}>{body}</p>
    </div>
  );
}

const card = {
  background: '#fff',
  borderRadius: 12,
  padding: '28px 32px',
  marginBottom: 20,
  border: '1px solid #e0e8f0',
};
const sectionHead = {
  margin: '0 0 14px',
  fontSize: 18,
  fontWeight: 900,
  color: '#1a2e4a',
  letterSpacing: 0.2,
};
const bodyText = {
  margin: 0,
  fontSize: 15,
  color: '#444',
  lineHeight: 1.75,
};
const th = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
const td = {
  padding: '12px 14px',
  verticalAlign: 'top',
  fontSize: 14,
};
