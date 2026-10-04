import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login          from './pages/Login.jsx';
import Register       from './pages/Register.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Assessment     from './pages/Assessment.jsx';
import AssessmentDone from './pages/AssessmentDone.jsx';
import Report         from './pages/Report.jsx';
import AdminQueue     from './pages/AdminQueue.jsx';
import Layout         from './components/Layout.jsx';

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

function ProtectedRoute({ children }) {
  // Protected if either SSO cookie exists (server validates) or localStorage token present
  const token = localStorage.getItem('ksb_user_token');
  // We can't read the HttpOnly cookie in JS, but the server will accept it.
  // Use localStorage token as the client-side gate; if absent the server's 401 will redirect.
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const token = localStorage.getItem('ksb_user_token');
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

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
