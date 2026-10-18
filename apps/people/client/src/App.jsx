import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login          from './pages/Login.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Assessment     from './pages/Assessment.jsx';
import AssessmentDone from './pages/AssessmentDone.jsx';
import Report         from './pages/Report.jsx';
import AdminQueue     from './pages/AdminQueue.jsx';
import Layout         from './components/Layout.jsx';
import api            from './api/client.js';

// Capture ?token= from the Google OAuth redirect SYNCHRONOUSLY, at module load —
// BEFORE any component renders. This must run before RootRedirect/ProtectedRoute
// read localStorage; otherwise the first render bounces a freshly-authenticated user
// back to /login (the bug seen on iOS Safari right after picking a Google account).
(function captureOAuthTokenFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    if (token) {
      localStorage.setItem('ksb_user_token', token);
      // Strip the token from the URL without a reload
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', clean);
    }
  } catch {
    /* localStorage blocked (e.g. private mode) — ignore */
  }
})();

function useAuthenticatedSession() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    api.get('/auth/me', { skipAuthRedirect: true })
      .then(({ data }) => {
        if (!active) return;
        localStorage.setItem('ksb_user', JSON.stringify(data.user));
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('ksb_user_token');
        localStorage.removeItem('ksb_user');
        setStatus('anonymous');
      });

    return () => { active = false; };
  }, []);

  return status;
}

function SessionLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f0f3f8', color: '#1a2e4a', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      Checking your session…
    </div>
  );
}

function ProtectedRoute({ children }) {
  const status = useAuthenticatedSession();
  if (status === 'checking') return <SessionLoading />;
  return status === 'authenticated' ? children : <Navigate to="/login" replace />;
}

function RootRedirect() {
  const status = useAuthenticatedSession();
  if (status === 'checking') return <SessionLoading />;
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter basename="/people">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login"    element={<Login />} />
        {/* Registration is automatic on first Google sign-in. */}
        <Route path="/register" element={<Navigate to="/login" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/assess/:token" element={
          <ProtectedRoute>
            <Assessment />
          </ProtectedRoute>
        } />

        <Route path="/assess/:token/done" element={
          <ProtectedRoute>
            <Layout><AssessmentDone /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/report/:id" element={
          <ProtectedRoute>
            <Layout><Report /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/admin/queue" element={<AdminQueue />} />
      </Routes>
    </BrowserRouter>
  );
}
