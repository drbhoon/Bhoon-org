import { useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem('ksb_user') || '{}');

  function logout() {
    localStorage.removeItem('ksb_user_token');
    localStorage.removeItem('ksb_user');
    navigate('/login');
  }

  const isAssessPage = location.pathname.startsWith('/assess/');

  return (
    <div style={{ minHeight: '100vh', background: '#f0f3f8', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Top nav */}
      <div style={{ background: '#1a2e4a', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 0.3, lineHeight: 1 }}>
              KSB Personality Analyser
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3, fontWeight: 500, letterSpacing: 0.4 }}>
              DISC Behavioural Assessment
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user.email && (
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500 }}>
                {user.email}
              </span>
            )}
            <button
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 7,
                padding: '6px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab bar — hidden on assessment pages */}
        {!isAssessPage && (
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: location.pathname === '/dashboard' ? '3px solid #4e9af1' : '3px solid transparent',
                color: location.pathname === '/dashboard' ? '#fff' : 'rgba(255,255,255,0.55)',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.3,
                marginBottom: -1,
              }}
            >
              DISC Profile
            </button>
            <button
              disabled
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '3px solid transparent',
                color: 'rgba(255,255,255,0.3)',
                padding: '12px 20px',
                cursor: 'not-allowed',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.3,
                marginBottom: -1,
              }}
            >
              Big Five — Coming Soon
            </button>
          </div>
        )}
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 64px' }}>
        {children}
      </div>
    </div>
  );
}
