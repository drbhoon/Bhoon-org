import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ full_name: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('ksb_user_token', data.token);
      localStorage.setItem('ksb_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f3f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: '#1a2e4a', borderRadius: 12, padding: '16px 28px', marginBottom: 16 }}>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 0.3 }}>KSB Personality Analyser</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4 }}>DISC Behavioural Assessment</div>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a2e4a' }}>Create your account</h1>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e0e8f0' }}>
          {error && (
            <div style={{ background: '#fef0f0', border: '1px solid #f5c6cb', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          <a
            href="/api/auth/google"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '11px 16px', boxSizing: 'border-box',
              border: '1.5px solid #d0d9e8', borderRadius: 8,
              background: '#fff', color: '#333',
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
              marginBottom: 20,
            }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              width="20" height="20" alt=""
            />
            Continue with Google
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#e0e8f0' }} />
            <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>or register with email</span>
            <div style={{ flex: 1, height: 1, background: '#e0e8f0' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 6 }}>Full name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d0d9e8', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Your full name"
              />
            </div>

            <div style={{ marginBottom: 18 }}>
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

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d0d9e8', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#8aabcc' : '#1a2e4a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563a8', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
