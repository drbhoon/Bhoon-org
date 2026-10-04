import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';

const ERROR_MESSAGES = {
  oauth_cancelled:       'Google sign-in was cancelled.',
  not_allowed:           'Your Google account is not on the approved list.',
  token_exchange_failed: 'Google authentication failed. Please try again.',
  profile_fetch_failed:  'Could not retrieve your Google profile. Please try again.',
  server_error:          'A server error occurred. Please try again.',
};

const STEPS = [
  {
    icon: '🔐',
    title: 'Secure sign-in',
    body: 'Continue with your Google account — fully encrypted, no passwords stored.',
  },
  {
    icon: '📝',
    title: 'Answer 24 questions',
    body: 'A quick forced-choice questionnaire. About 10 minutes — there are no right or wrong answers.',
  },
  {
    icon: '📊',
    title: 'Get your profile',
    body: 'Receive a detailed report on your behavioural style, strengths, motivators and growth areas.',
  },
];

const DISCOVER = [
  'Your natural DISC style',
  'How you act at work vs. under pressure',
  'What motivates & drains you',
  'Your communication & decision style',
];

export default function Login() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const oauthError      = searchParams.get('error');

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState(oauthError ? ERROR_MESSAGES[oauthError] || 'Sign-in failed.' : '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('ksb_user_token', data.token);
      localStorage.setItem('ksb_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <style>{`
        .ks-bg { min-height:100vh; background:linear-gradient(155deg,#0e1b30 0%,#1a2e4a 52%,#223b5d 100%); }
        .ks-wrap { display:flex; gap:56px; max-width:1100px; margin:0 auto; padding:56px 28px; align-items:center; }
        .ks-intro { flex:1 1 540px; color:#eaf1fb; }
        .ks-auth  { flex:0 0 410px; }
        @media (max-width: 880px) {
          .ks-wrap { flex-direction:column; gap:34px; padding:34px 18px; align-items:stretch; }
          .ks-auth { order:-1; flex-basis:auto; }
          .ks-intro { flex-basis:auto; }
        }
      `}</style>

      <div className="ks-bg">
        <div className="ks-wrap">
          {/* ── Left: introduction ─────────────────────────────── */}
          <div className="ks-intro">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#3d7bd6,#5a9bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧭</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 0.3 }}>KSB Personality Analyser</div>
                <div style={{ fontSize: 11.5, color: '#8fa6c4', marginTop: 1 }}>DISC Behavioural Assessment</div>
              </div>
            </div>

            <h1 style={{ margin: '0 0 14px', fontSize: 42, lineHeight: 1.1, fontWeight: 900, letterSpacing: -0.5 }}>
              Know <span style={{ color: '#6aa6ff' }}>yourself.</span>
            </h1>
            <p style={{ margin: '0 0 30px', fontSize: 17, lineHeight: 1.55, color: '#bcccdf', maxWidth: 520 }}>
              Understand how you naturally communicate, make decisions, and respond under pressure —
              then use that insight to play to your strengths and grow with intention.
            </p>

            {/* Message from Dr KS Bhoon */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '22px 24px', marginBottom: 30, maxWidth: 540 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#6aa6ff', letterSpacing: 0.4, marginBottom: 10 }}>A MESSAGE FROM DR KS BHOON</div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: '#d6e1f0', fontStyle: 'italic' }}>
                “We spend years learning skills, but very little time learning ourselves. Yet how you behave —
                in calm and under pressure — shapes every team you join and every decision you make.
                This DISC profile is a simple, honest mirror. My hope is that it helps you understand your
                natural style and become the best version of yourself.”
              </p>
              <div style={{ marginTop: 12, fontSize: 13.5, fontWeight: 700, color: '#9fb6d4' }}>— Dr KS Bhoon</div>
            </div>

            {/* How it works */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 26 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 38px', height: 38, borderRadius: 10, background: 'rgba(106,166,255,0.14)', border: '1px solid rgba(106,166,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#eaf1fb', marginBottom: 2 }}>
                      <span style={{ color: '#6aa6ff', marginRight: 8 }}>{i + 1}.</span>{s.title}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#9fb3cd' }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* What you'll discover */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', maxWidth: 540 }}>
              {DISCOVER.map((d) => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#b9c9de' }}>
                  <span style={{ color: '#5ad19a', fontWeight: 900 }}>✓</span>{d}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: sign-in card ────────────────────────────── */}
          <div className="ks-auth">
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 18px 50px rgba(0,0,0,0.35)' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#1a2e4a', textAlign: 'center' }}>Begin your profile</h2>
              <p style={{ margin: '0 0 24px', fontSize: 13.5, color: '#7a8aa0', textAlign: 'center' }}>Sign in to take the assessment</p>

              {error && (
                <div style={{ background: '#fef0f0', border: '1px solid #f5c6cb', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
                  {error}
                </div>
              )}

              {/* Google Sign-In */}
              <a
                href="/people/api/auth/google"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '12px 16px', boxSizing: 'border-box',
                  border: '1.5px solid #d0d9e8', borderRadius: 9,
                  background: '#fff', color: '#333',
                  fontSize: 15, fontWeight: 700, textDecoration: 'none',
                }}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="" />
                Continue with Google
              </a>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, fontSize: 11.5, color: '#9aa7ba' }}>
                <span style={{ color: '#5ad19a' }}>🔒</span> Secured by Google OAuth 2.0 · No passwords stored
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#e0e8f0' }} />
                <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>or sign in with email</span>
                <div style={{ flex: 1, height: 1, background: '#e0e8f0' }} />
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 6 }}>Email address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d0d9e8', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="you@example.com"
                  />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 6 }}>Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d0d9e8', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px',
                    background: loading ? '#8aabcc' : '#1a2e4a',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#2563a8', fontWeight: 700, textDecoration: 'none' }}>Create one</Link>
              </p>

              <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #eef2f7' }}>
                <Link to="/admin/queue" style={{ color: '#9aa7ba', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>Admin access</Link>
              </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#7e93b3' }}>
              © 2026 KSB Personality Analyser · A self-discovery tool, not a hiring tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
