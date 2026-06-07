import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function AdminQueue() {
  const [creds, setCreds]   = useState(() => {
    const saved = sessionStorage.getItem('ksb_admin_creds');
    return saved ? JSON.parse(saved) : { username: '', password: '' };
  });
  const [authed, setAuthed]   = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [queue, setQueue]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState('');
  const [approving, setApproving] = useState(null);

  function authHeader() {
    return 'Basic ' + btoa(`${creds.username}:${creds.password}`);
  }

  async function fetchData(header) {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/admin/queue', { headers: { Authorization: header } }),
        fetch('/api/admin/stats', { headers: { Authorization: header } }),
      ]);
      if (qRes.status === 401) { setAuthErr('Invalid credentials'); return false; }
      const qData = await qRes.json();
      const sData = await sRes.json();
      setQueue(qData.queue || []);
      setStats(sData);
      return true;
    } catch {
      setAuthErr('Failed to connect to server');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthErr('');
    const header = 'Basic ' + btoa(`${creds.username}:${creds.password}`);
    const ok = await fetchData(header);
    if (ok) {
      sessionStorage.setItem('ksb_admin_creds', JSON.stringify(creds));
      setAuthed(true);
    }
  }

  async function handleApprove(assessmentId) {
    setApproving(assessmentId);
    try {
      const res = await fetch(`/api/admin/queue/${assessmentId}/approve`, {
        method: 'POST',
        headers: { Authorization: authHeader() },
      });
      if (res.ok) {
        setQueue((q) => q.filter((r) => r.assessment_id !== assessmentId));
        setToast('Generation triggered — email will be sent on completion.');
        setTimeout(() => setToast(''), 4000);
        // Refresh stats
        const sRes = await fetch('/api/admin/stats', { headers: { Authorization: authHeader() } });
        if (sRes.ok) setStats(await sRes.json());
      } else {
        alert('Approval failed. Please try again.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setApproving(null);
    }
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f3f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 36, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid #e0e8f0' }}>
          <h2 style={{ margin: '0 0 24px', color: '#1a2e4a', fontSize: 20, fontWeight: 900 }}>Admin — Sign In</h2>
          {authErr && (
            <div style={{ background: '#fef0f0', border: '1px solid #f5c6cb', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#c0392b', fontSize: 14 }}>
              {authErr}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 6 }}>Username</label>
              <input
                type="text"
                required
                value={creds.username}
                onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d0d9e8', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                required
                value={creds.password}
                onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d0d9e8', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              style={{ width: '100%', padding: 12, background: '#1a2e4a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f3f8', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#1a7a42', color: '#fff', padding: '14px 22px', borderRadius: 9, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      <div style={{ background: '#1a2e4a', padding: '0 28px', minHeight: 60, display: 'flex', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>KSB Personality Analyser — Admin</span>
      </div>

      <div style={{ maxWidth: 900, margin: '28px auto', padding: '0 24px' }}>
        {/* Stats bar */}
        {stats && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Users',       value: stats.total_users },
              { label: 'Completed Reports', value: stats.completed_reports },
              { label: 'Queued Reports',    value: stats.queued_reports },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 24px', border: '1px solid #e0e8f0', flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#1a2e4a' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e0e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1a2e4a' }}>Report Queue</h2>
            <span style={{ fontSize: 13, color: '#888' }}>{queue.length} waiting</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading…</div>
          ) : queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 700, color: '#1a2e4a', marginBottom: 6 }}>Queue is empty</div>
              <div style={{ fontSize: 14 }}>All reports have been processed.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafd', borderBottom: '1px solid #e0e8f0' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Submitted</th>
                  <th style={{ ...th, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => (
                  <tr key={r.assessment_id} style={{ borderBottom: '1px solid #f0f3f8' }}>
                    <td style={td}>{r.full_name}</td>
                    <td style={{ ...td, color: '#555' }}>{r.email}</td>
                    <td style={{ ...td, color: '#888' }}>
                      {new Date(r.queued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        onClick={() => handleApprove(r.assessment_id)}
                        disabled={approving === r.assessment_id}
                        style={{
                          background: approving === r.assessment_id ? '#b0bbc8' : '#1a7a42',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 7,
                          padding: '7px 18px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: approving === r.assessment_id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {approving === r.assessment_id ? 'Triggering…' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '14px 16px', verticalAlign: 'middle', color: '#333', fontWeight: 500 };
