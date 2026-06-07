import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

const STATUS_BADGE = {
  completed: { label: 'Completed',       bg: '#d4edda', color: '#155724' },
  queued:    { label: 'Report Pending',  bg: '#fff3cd', color: '#856404' },
  pending:   { label: 'Generating…',    bg: '#cce5ff', color: '#004085' },
  default:   { label: 'In Progress',    bg: '#f0f3f8', color: '#555' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('ksb_user') || '{}');
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);

  useEffect(() => {
    api.get('/assess/list')
      .then((res) => setAssessments(res.data.assessments || []))
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false));
  }, []);

  async function startNew() {
    setCreating(true);
    try {
      const { data } = await api.post('/assess/create');
      navigate(`/assess/${data.token}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create assessment.');
      setCreating(false);
    }
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#1a2e4a' }}>
            Welcome, {user.full_name || 'there'}
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: 15 }}>Your DISC assessment history</p>
        </div>
        {/* Header CTA only once there's history — the empty state has its own button */}
        {!loading && assessments.length > 0 && (
          <button
            onClick={startNew}
            disabled={creating}
            style={{
              background: creating ? '#8aabcc' : '#1a2e4a',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: creating ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {creating ? 'Creating…' : '+ Start New DISC Assessment'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading…</div>
      ) : assessments.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '48px 32px', textAlign: 'center', border: '1.5px dashed #d0d9e8' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1a2e4a' }}>No assessments yet</p>
          <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Take your first DISC assessment to understand your behavioural style.</p>
          <button
            onClick={startNew}
            disabled={creating}
            style={{ background: '#1a2e4a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            Start Assessment
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assessments.map((a) => {
            const badge = STATUS_BADGE[a.report_status] || STATUS_BADGE.default;
            const date  = new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <div
                key={a.id}
                style={{
                  background: '#fff',
                  borderRadius: 10,
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  border: '1px solid #e0e8f0',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>{date}</div>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.color,
                  }}>
                    {badge.label}
                  </span>
                </div>

                <div>
                  {a.report_status === 'completed' && (
                    <button
                      onClick={() => navigate(`/report/${a.id}`)}
                      style={{ background: '#2563a8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      View Report
                    </button>
                  )}
                  {(a.report_status === 'queued') && (
                    <span style={{ fontSize: 13, color: '#856404', fontWeight: 600 }}>
                      Report will be emailed to you
                    </span>
                  )}
                  {(a.report_status === 'pending' || !a.report_status) && a.status !== 'pending' && (
                    <button
                      onClick={() => navigate(`/assess/${a.token}/done`)}
                      style={{ background: '#f0f3f8', color: '#1a2e4a', border: '1.5px solid #d0d9e8', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Check Status
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
