import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function AdminQueue() {
  const navigate = useNavigate();
  const [creds, setCreds]   = useState(() => {
    const saved = sessionStorage.getItem('ksb_admin_creds');
    return saved ? JSON.parse(saved) : { username: '', password: '' };
  });
  const [authed, setAuthed]   = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [queue, setQueue]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [incomplete, setIncomplete] = useState([]);
  const [stats, setStats]         = useState(null);
  const [tab, setTab]             = useState('users');
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState('');
  const [approving, setApproving] = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [ssoMode, setSsoMode]     = useState(false);

  function authHeader() {
    return 'Basic ' + btoa(`${creds.username}:${creds.password}`);
  }

  // On mount: if the logged-in user is the admin (email === ADMIN_EMAIL), open the
  // panel automatically using their session — no separate admin password needed.
  useEffect(() => {
    if (!localStorage.getItem('ksb_user_token')) return;
    let cancelled = false;
    (async () => {
      try {
        const [q, s, u, i] = await Promise.all([
          api.get('/admin/queue'), api.get('/admin/stats'),
          api.get('/admin/users'), api.get('/admin/incomplete'),
        ]);
        if (cancelled) return;
        setQueue(q.data.queue || []);
        setStats(s.data);
        setUsers(u.data.users || []);
        setIncomplete(i.data.incomplete || []);
        setSsoMode(true);
        setAuthed(true);
      } catch { /* not an admin via session — fall back to the password form */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function fetchData(header) {
    setLoading(true);
    try {
      const [qRes, sRes, uRes, iRes] = await Promise.all([
        fetch('/api/admin/queue', { headers: { Authorization: header } }),
        fetch('/api/admin/stats', { headers: { Authorization: header } }),
        fetch('/api/admin/users', { headers: { Authorization: header } }),
        fetch('/api/admin/incomplete', { headers: { Authorization: header } }),
      ]);
      if (qRes.status === 401) { setAuthErr('Invalid credentials'); return false; }
      setQueue((await qRes.json()).queue || []);
      setStats(await sRes.json());
      setUsers((await uRes.json()).users || []);
      setIncomplete((await iRes.json()).incomplete || []);
      return true;
    } catch {
      setAuthErr('Failed to connect to server');
      return false;
    } finally {
      setLoading(false);
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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

  // Issue an admin request via the SSO session (api client) or Basic auth, depending on mode.
  // Throws on failure in both modes so callers' catch blocks handle it.
  async function adminReq(method, path) {
    if (ssoMode) {
      const res = await api({ method, url: path });   // api baseURL = '/api'
      return res.data;
    }
    const res = await fetch(`/api${path}`, { method, headers: { Authorization: authHeader() } });
    if (!res.ok) throw new Error('request failed');
    return await res.json().catch(() => ({}));
  }

  async function handleApprove(assessmentId) {
    setApproving(assessmentId);
    try {
      await adminReq('post', `/admin/queue/${assessmentId}/approve`);
      setQueue((q) => q.filter((r) => r.assessment_id !== assessmentId));
      setToast('Generation triggered — email will be sent on completion.');
      setTimeout(() => setToast(''), 4000);
      const s = await adminReq('get', '/admin/stats');
      if (s) setStats(s);
    } catch {
      alert('Approval failed. Please try again.');
    } finally {
      setApproving(null);
    }
  }

  async function handleDelete(assessmentId) {
    if (!window.confirm('Delete this in-progress assessment? This cannot be undone.')) return;
    setDeleting(assessmentId);
    try {
      await adminReq('delete', `/admin/assessment/${assessmentId}`);
      setIncomplete((list) => list.filter((r) => r.id !== assessmentId));
      setToast('In-progress assessment deleted.');
      setTimeout(() => setToast(''), 3500);
    } catch {
      alert('Delete failed. Please try again.');
    } finally {
      setDeleting(null);
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 6 }}>Admin email</label>
              <input
                type="text"
                required
                value={creds.username}
                onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                placeholder="set as ADMIN_EMAIL in Railway"
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

      <div style={{ background: '#1a2e4a', padding: '0 28px', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>KSB Personality Analyser — Admin</span>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '28px auto', padding: '0 24px' }}>
        {/* Stats bar */}
        {stats && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: stats.limit_reached ? 16 : 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Users',       value: stats.total_users },
                { label: `Completed Reports`, value: `${stats.completed_reports} / ${stats.limit ?? 500}`, alert: stats.limit_reached },
                { label: 'Queued Reports',    value: stats.queued_reports },
              ].map((s) => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 24px', border: s.alert ? '1.5px solid #ffb84d' : '1px solid #e0e8f0', flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.alert ? '#b86a00' : '#1a2e4a' }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {stats.limit_reached && (
              <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 10, padding: '12px 18px', marginBottom: 24, color: '#8a5a00', fontSize: 14, fontWeight: 600 }}>
                ⏸️ The {stats.limit ?? 500}-profile limit has been reached. New profiling is paused for visitors. To resume, raise <code>AI_REPORT_LIMIT</code> in Railway.
              </div>
            )}
          </>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['users', `Users (${users.length})`], ['incomplete', `In Progress (${incomplete.length})`], ['queue', `Report Queue (${queue.length})`]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: tab === key ? '#1a2e4a' : '#fff',
                color: tab === key ? '#fff' : '#1a2e4a',
                border: '1px solid #d0d9e8', borderRadius: 8,
                padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e0e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1a2e4a' }}>Who used your service</h2>
              <span style={{ fontSize: 13, color: '#888' }}>{users.length} registered</span>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading…</div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>No users yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafd', borderBottom: '1px solid #e0e8f0' }}>
                      <th style={th}>Email</th>
                      <th style={th}>Name</th>
                      <th style={th}>Via</th>
                      <th style={{ ...th, textAlign: 'center' }}>Assessments</th>
                      <th style={{ ...th, textAlign: 'center' }}>Reports</th>
                      <th style={th}>Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f0f3f8' }}>
                        <td style={{ ...td, fontWeight: 600 }}>{u.email}</td>
                        <td style={{ ...td, color: '#555' }}>{u.full_name || '—'}</td>
                        <td style={{ ...td, color: '#888', fontSize: 13 }}>{u.auth_method === 'google' ? 'Google' : 'Password'}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{u.assessments}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{u.completed_reports}</td>
                        <td style={{ ...td, color: '#888', fontSize: 13 }}>{fmtDate(u.last_login || u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* In Progress tab — started but never submitted */}
        {tab === 'incomplete' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e0e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1a2e4a' }}>In progress / not finished</h2>
              <span style={{ fontSize: 13, color: '#888' }}>{incomplete.length} started</span>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading…</div>
            ) : incomplete.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
                <div style={{ fontWeight: 700, color: '#1a2e4a', marginBottom: 6 }}>Nothing in progress</div>
                <div style={{ fontSize: 14 }}>Everyone who started has submitted.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafd', borderBottom: '1px solid #e0e8f0' }}>
                      <th style={th}>Email</th>
                      <th style={th}>Name</th>
                      <th style={th}>Started</th>
                      <th style={th}>Status</th>
                      <th style={{ ...th, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomplete.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f0f3f8' }}>
                        <td style={{ ...td, fontWeight: 600 }}>{r.email}</td>
                        <td style={{ ...td, color: '#555' }}>{r.full_name || '—'}</td>
                        <td style={{ ...td, color: '#888' }}>{fmtDate(r.created_at)}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: '#fff3cd', color: '#856404' }}>Under progress</span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            style={{ background: deleting === r.id ? '#e0b4b4' : '#c0392b', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: deleting === r.id ? 'not-allowed' : 'pointer' }}
                          >
                            {deleting === r.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'queue' && (

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
        )}
      </div>
    </div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '14px 16px', verticalAlign: 'middle', color: '#333', fontWeight: 500 };
