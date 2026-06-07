import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login          from './pages/Login.jsx';
import Register       from './pages/Register.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Assessment     from './pages/Assessment.jsx';
import AssessmentDone from './pages/AssessmentDone.jsx';
import Report         from './pages/Report.jsx';
import AdminQueue     from './pages/AdminQueue.jsx';
import Layout         from './components/Layout.jsx';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('ksb_user_token');
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
