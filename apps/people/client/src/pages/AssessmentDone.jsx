import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';

export default function AssessmentDone() {
  const { token }    = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const user         = JSON.parse(localStorage.getItem('ksb_user') || '{}');

  const [assessmentId, setAssessmentId] = useState(location.state?.assessmentId || null);
  const [status, setStatus]             = useState('pending');
  const [resolved, setResolved]         = useState(false);

  // If we don't have the assessmentId from state, fetch it via token
  useEffect(() => {
    if (assessmentId) return;
    api.get(`/assess/${token}`)
      .catch(() => {})
      .then((res) => {
        if (res?.data?.assessmentId) setAssessmentId(res.data.assessmentId);
      });
  }, [token, assessmentId]);

  useEffect(() => {
    if (!assessmentId) return;
    let stopped = false;

    async function poll() {
      while (!stopped) {
        try {
          const { data } = await api.get(`/report/${assessmentId}/poll`);
          if (!stopped) {
            setStatus(data.status);
            if (data.status === 'completed' || data.status === 'queued' || data.status === 'failed') {
              setResolved(true);
              return;
            }
          }
        } catch {
          // keep polling
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    poll();
    return () => { stopped = true; };
  }, [assessmentId]);

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", textAlign: 'center', padding: '40px 20px' }}>
      {status === 'completed' && (
        <div>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: '#1a7a42', fontWeight: 900, fontSize: 24, margin: '0 0 10px' }}>Your report is ready!</h2>
          <p style={{ color: '#555', fontSize: 16, margin: '0 0 28px', lineHeight: 1.6 }}>
            Your DISC personality report has been generated.
          </p>
          <Link
            to={`/report/${assessmentId}`}
            style={{ display: 'inline-block', background: '#2563a8', color: '#fff', textDecoration: 'none', padding: '14px 32px', borderRadius: 9, fontWeight: 700, fontSize: 16 }}
          >
            View Your Report
          </Link>
        </div>
      )}

      {status === 'queued' && (
        <div>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
          <h2 style={{ color: '#856404', fontWeight: 900, fontSize: 24, margin: '0 0 10px' }}>Report in review</h2>
          <p style={{ color: '#555', fontSize: 16, margin: '0 0 16px', lineHeight: 1.6 }}>
            Your report is being reviewed and will be emailed to{' '}
            <strong>{user.email}</strong> once it's ready.
          </p>
          <p style={{ color: '#888', fontSize: 14, margin: '0 0 28px' }}>
            This typically takes 1–2 business days.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: '#1a2e4a', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {status === 'pending' && (
        <div>
          <div style={{ margin: '0 auto 20px', width: 48, height: 48, border: '5px solid #dce5f0', borderTopColor: '#2563a8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: '#1a2e4a', fontWeight: 900, fontSize: 22, margin: '0 0 10px' }}>Generating your report…</h2>
          <p style={{ color: '#666', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            Claude is analysing your DISC profile. This usually takes 30–60 seconds.
          </p>
        </div>
      )}

      {status === 'failed' && (
        <div>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#c0392b', fontWeight: 900, fontSize: 22, margin: '0 0 10px' }}>Generation failed</h2>
          <p style={{ color: '#555', fontSize: 15, margin: '0 0 24px' }}>
            Something went wrong generating your report. Please contact support.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: '#1a2e4a', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
